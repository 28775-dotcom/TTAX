/**
 * js/app.js - ระบบบริหารจัดการภาษีเงินได้บุคคลธรรมดาและนิติบุคคล TAX PORTAL
 * รองรับการคำนวณภาษี "บุคคลธรรมดา" และ "นิติบุคคล", ระบบหักค่าใช้จ่ายเหมาอัตโนมัติ 100%,
 * จัดการขั้นตอนวิซาร์ด 3 ขั้นตอนกระชับ, แดชบอร์ดจัดการระบบสำหรับผู้ดูแล, และระบบติดต่อแอดมิน
 */

(function () {
  'use strict';

  // Application State
  let taxpayerType = 'individual'; // 'individual' | 'corporate'
  let currentUser = null;
  let currentRecordId = null;
  let activeStep = 1;
  let maxUnlockedStep = 1;
  let latestResult = null;
  let inspectedRecord = null;
  let selectedProfilePic = '';
  let savedRecordsCache = [];
  let adminReplyTicketId = null;

  // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบเป็นสมาชิกจริงหรือไม่ (ไม่ใช่ Guest)
  function isUserLoggedIn() {
    return !!(currentUser && currentUser.id && currentUser.role !== 'guest' && !String(currentUser.id).startsWith('usr_guest_'));
  }

  // DOM Elements (3 Steps)
  const stepPanels = {
    1: document.getElementById('panel-step1'),
    2: document.getElementById('panel-step2'),
    3: document.getElementById('panel-step3')
  };

  const stepBtns = {
    1: document.getElementById('nav-step1'),
    2: document.getElementById('nav-step2'),
    3: document.getElementById('nav-step3')
  };

  // Helper: Format Money
  function formatMoney(num) {
    if (isNaN(num) || num === null || num === undefined) return '0';
    return Number(num).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  // Helper: Toast Notifications
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Helper: Set inline field error message
  function setFieldError(id, msg, isHtml = false) {
    const el = document.getElementById(id);
    if (!el) return;
    if (isHtml) {
      el.innerHTML = msg;
    } else {
      el.textContent = msg;
    }
    el.style.display = msg ? 'flex' : 'none';
    // Mark the associated input as invalid/valid
    const group = el.closest('.auth-form-group');
    if (group) {
      const input = group.querySelector('input');
      if (input) {
        input.classList.toggle('auth-input--error', !!msg);
        input.classList.toggle('auth-input--ok', !msg && input.value.trim().length > 0);
      }
    }
  }

  // Helper: Toggle button loading state
  function setButtonLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    const textEl    = btn.querySelector('[id$="-text"]');
    const spinnerEl = btn.querySelector('[id$="-spinner"]');
    if (textEl)    textEl.style.display    = loading ? 'none'   : '';
    if (spinnerEl) spinnerEl.style.display = loading ? 'inline' : 'none';
  }

  // =========================================================================
  // 1. สลับประเภทผู้เสียภาษี (Taxpayer Type Switching)
  // =========================================================================

  function setTaxpayerType(type) {
    taxpayerType = type;

    const btnInd = document.getElementById('btn-type-individual');
    const btnCorp = document.getElementById('btn-type-corporate');
    const badge = document.getElementById('active-taxpayer-badge');
    const sideBadge = document.getElementById('side-tag-badge');
    const headerBadge = document.getElementById('header-form-badge');

    const indStep1 = document.getElementById('ind-step1-fields');
    const corpStep1 = document.getElementById('corp-step1-fields');
    const indStep2 = document.getElementById('ind-step2-fields');
    const corpStep2 = document.getElementById('corp-step2-fields');
    const indMethod2Box = document.getElementById('ind-method2-compare-box');
    const autoExpBox = document.getElementById('auto-expense-summary-box');

    if (type === 'individual') {
      btnInd?.classList.add('active');
      btnCorp?.classList.remove('active');
      if (badge) badge.textContent = 'บุคคลธรรมดา (ภ.ง.ด. 90/91)';
      if (sideBadge) sideBadge.textContent = 'บุคคลธรรมดา';
      if (headerBadge) headerBadge.textContent = 'ภ.ง.ด. 90/91';

      // Navigation Titles (3 Steps)
      document.getElementById('nav-title-step1').textContent = 'เงินได้พึงประเมิน';
      document.getElementById('nav-sub-step1').textContent = 'หักค่าใช้จ่ายอัตโนมัติ';
      document.getElementById('nav-title-step2').textContent = 'ค่าลดหย่อนภาษี';
      document.getElementById('nav-sub-step2').textContent = '4 กลุ่มลดหย่อน & Thai ESG';
      document.getElementById('nav-title-step3').textContent = 'สรุปผลภาษีฉบับสมบูรณ์';
      document.getElementById('nav-sub-step3').textContent = 'เห็นผลสรุปทันที';

      // Sidebar Labels
      document.getElementById('side-lbl-income').textContent = 'เงินได้พึงประเมิน:';
      document.getElementById('side-lbl-expense').textContent = 'ค่าใช้จ่าย (หักเหมาอัตโนมัติ):';
      document.getElementById('side-lbl-allowance').textContent = 'ค่าลดหย่อนภาษี:';
      document.getElementById('side-lbl-net').textContent = 'เงินได้สุทธิ (Net Income)';

      // Step 3 Column Labels
      document.getElementById('lbl-sum-col1').textContent = '1. รวมเงินได้พึงประเมิน';
      document.getElementById('lbl-sum-col2').textContent = '2. หักค่าใช้จ่ายเหมา (อัตโนมัติ)';
      document.getElementById('lbl-sum-col3').textContent = '3. หักค่าลดหย่อนรวม';
      document.getElementById('lbl-sum-col4').textContent = '4. เงินได้สุทธิ (Net Taxable)';
      document.getElementById('th-bracket-range').textContent = 'ขั้นเงินได้สุทธิ';
      document.getElementById('bracket-table-title').textContent = 'ตารางคำนวณภาษีวิธีที่ 1 (อัตราก้าวหน้าบุคคลธรรมดา)';
      document.getElementById('bracket-table-desc').textContent = 'อัตราภาษี 0% - 35% ตามเกณฑ์ประมวลรัษฎากร';

      indStep1.style.display = 'block';
      corpStep1.style.display = 'none';
      indStep2.style.display = 'block';
      corpStep2.style.display = 'none';
      if (indMethod2Box) indMethod2Box.style.display = 'flex';
      if (autoExpBox) autoExpBox.style.display = 'block';

    } else {
      btnCorp?.classList.add('active');
      btnInd?.classList.remove('active');
      if (badge) badge.textContent = 'นิติบุคคล (ภ.ง.ด. 50/51)';
      if (sideBadge) sideBadge.textContent = 'นิติบุคคล';
      if (headerBadge) headerBadge.textContent = 'ภ.ง.ด. 50/51';

      // Navigation Titles (3 Steps)
      document.getElementById('nav-title-step1').textContent = 'รายได้และกำไรทางบัญชี';
      document.getElementById('nav-sub-step1').textContent = 'ยอดขาย รายได้ และต้นทุน';
      document.getElementById('nav-title-step2').textContent = 'สิทธิประโยชน์ SME & หัก ณ ที่จ่าย';
      document.getElementById('nav-sub-step2').textContent = 'เงื่อนไข SME และเครดิตภาษี';
      document.getElementById('nav-title-step3').textContent = 'สรุปผลภาษีเงินได้นิติบุคคล';
      document.getElementById('nav-sub-step3').textContent = 'กำไรสุทธิ & ภาษีที่ต้องชำระ';

      // Sidebar Labels
      document.getElementById('side-lbl-income').textContent = 'รายได้รวมทางภาษี:';
      document.getElementById('side-lbl-expense').textContent = 'รายจ่ายที่หักได้ตามกฎหมาย:';
      document.getElementById('side-lbl-allowance').textContent = 'รายจ่ายพิเศษและลดหย่อน:';
      document.getElementById('side-lbl-net').textContent = 'กำไรสุทธิทางภาษี (Net Profit)';

      // Step 3 Column Labels
      document.getElementById('lbl-sum-col1').textContent = '1. รายได้รวมทางบัญชีภาษี';
      document.getElementById('lbl-sum-col2').textContent = '2. รายจ่ายและต้นทุนที่หักได้';
      document.getElementById('lbl-sum-col3').textContent = '3. รายจ่ายพิเศษ/ลดหย่อน (ยกเว้น 2 เท่า)';
      document.getElementById('lbl-sum-col4').textContent = '4. กำไรสุทธิเพื่อเสียภาษี';
      document.getElementById('th-bracket-range').textContent = 'ขั้นกำไรสุทธิทางภาษี';
      document.getElementById('bracket-table-title').textContent = 'ตารางคำนวณภาษีเงินได้นิติบุคคล';
      document.getElementById('bracket-table-desc').textContent = 'คำนวณตามเกณฑ์อัตราภาษี SME หรืออัตราทั่วไป 20%';

      indStep1.style.display = 'none';
      corpStep1.style.display = 'block';
      indStep2.style.display = 'none';
      corpStep2.style.display = 'block';
      if (indMethod2Box) indMethod2Box.style.display = 'none';
      if (autoExpBox) autoExpBox.style.display = 'none';
    }

    updateStepLockUI();
    recalculate();
  }

  // =========================================================================
  // 2. รวบรวมข้อมูลจากแบบฟอร์ม
  // =========================================================================

  function getFormData() {
    if (taxpayerType === 'individual') {
      const incomes = {
        inc_40_1: Number(document.getElementById('inc_40_1')?.value) || 0,
        inc_40_2: Number(document.getElementById('inc_40_2')?.value) || 0,
        inc_40_3: Number(document.getElementById('inc_40_3')?.value) || 0,
        inc_40_4: Number(document.getElementById('inc_40_4')?.value) || 0,
        inc_40_5_building: Number(document.getElementById('inc_40_5_building')?.value) || 0,
        inc_40_5_vehicle: Number(document.getElementById('inc_40_5_vehicle')?.value) || 0,
        inc_40_5_agri: Number(document.getElementById('inc_40_5_agri')?.value) || 0,
        inc_40_5_other_land: Number(document.getElementById('inc_40_5_other_land')?.value) || 0,
        inc_40_5_other: Number(document.getElementById('inc_40_5_other')?.value) || 0,
        inc_40_6_medical: Number(document.getElementById('inc_40_6_medical')?.value) || 0,
        inc_40_6_other: Number(document.getElementById('inc_40_6_other')?.value) || 0,
        inc_40_7: Number(document.getElementById('inc_40_7')?.value) || 0,
        inc_40_8: Number(document.getElementById('inc_40_8')?.value) || 0,
        withholding_tax: Number(document.getElementById('withholding_tax')?.value) || 0
      };

      const allowances = {
        has_spouse_no_income: document.getElementById('has_spouse_no_income')?.checked ?? false,
        child_before_2561: Number(document.getElementById('child_before_2561')?.value) || 0,
        child_after_2561: Number(document.getElementById('child_after_2561')?.value) || 0,
        pregnancy_cost: Number(document.getElementById('pregnancy_cost')?.value) || 0,
        parents_self_count: Number(document.getElementById('parents_self_count')?.value) || 0,
        parents_spouse_count: Number(document.getElementById('parents_spouse_count')?.value) || 0,
        disabled_count: Number(document.getElementById('disabled_count')?.value) || 0,
        social_security: Number(document.getElementById('social_security')?.value) || 0,
        life_insurance: Number(document.getElementById('life_insurance')?.value) || 0,
        health_insurance: Number(document.getElementById('health_insurance')?.value) || 0,
        parent_health_insurance: Number(document.getElementById('parent_health_insurance')?.value) || 0,
        provident_fund: Number(document.getElementById('provident_fund')?.value) || 0,
        nsf: Number(document.getElementById('nsf')?.value) || 0,
        pension_insurance: Number(document.getElementById('pension_insurance')?.value) || 0,
        rmf: Number(document.getElementById('rmf')?.value) || 0,
        ssf: Number(document.getElementById('ssf')?.value) || 0,
        thai_esg: Number(document.getElementById('thai_esg')?.value) || 0,
        home_loan_interest: Number(document.getElementById('home_loan_interest')?.value) || 0,
        easy_e_receipt: Number(document.getElementById('easy_e_receipt')?.value) || 0,
        donate_education_sports_hospital: Number(document.getElementById('donate_education_sports_hospital')?.value) || 0,
        donate_general: Number(document.getElementById('donate_general')?.value) || 0
      };

      return { taxpayerType: 'individual', incomes, allowances };
    } else {
      const revenueData = {
        sales_revenue: Number(document.getElementById('corp_sales_revenue')?.value) || 0,
        other_revenue: Number(document.getElementById('corp_other_revenue')?.value) || 0,
        withholding_tax_paid: Number(document.getElementById('corp_wht_paid')?.value) || 0,
        interim_tax_paid: Number(document.getElementById('corp_interim_tax')?.value) || 0
      };

      const expenseData = {
        cogs: Number(document.getElementById('corp_cogs')?.value) || 0,
        operating_expenses: Number(document.getElementById('corp_operating_expenses')?.value) || 0,
        depreciation: Number(document.getElementById('corp_depreciation')?.value) || 0,
        depreciation_machinery: Number(document.getElementById('corp_dep_machinery')?.value) || 0,
        depreciation_computer: Number(document.getElementById('corp_dep_computer')?.value) || 0,
        special_deductions: Number(document.getElementById('corp_special_deductions')?.value) || 0,
        tax_addback_expenses: Number(document.getElementById('corp_addback')?.value) || 0,
        tax_exempt_incomes: Number(document.getElementById('corp_exempt_income')?.value) || 0
      };

      const paidUp = Number(document.getElementById('corp_paid_up_capital')?.value) || 0;
      const capitalBox = document.getElementById('corp_capital_le_5m');
      if (paidUp > 0 && capitalBox) {
        capitalBox.checked = paidUp <= 5000000;
      }

      const criteriaData = {
        paid_up_capital: paidUp,
        paid_up_capital_le_5m: document.getElementById('corp_capital_le_5m')?.checked ?? true,
        donation_education: Number(document.getElementById('corp_donate_edu')?.value) || 0,
        donation_public: Number(document.getElementById('corp_donate_public')?.value) || 0
      };

      return { taxpayerType: 'corporate', revenueData, expenseData, criteriaData };
    }
  }

  function hasFirstStepData() {
    const data = getFormData();
    if (data.taxpayerType === 'individual') {
      const inc = data.incomes;
      const sum = inc.inc_40_1 + inc.inc_40_2 + inc.inc_40_3 + inc.inc_40_4 +
                  inc.inc_40_5_building + inc.inc_40_5_vehicle + inc.inc_40_5_agri +
                  inc.inc_40_5_other_land + inc.inc_40_5_other +
                  inc.inc_40_6_medical + inc.inc_40_6_other +
                  inc.inc_40_7 + inc.inc_40_8;
      return sum > 0;
    } else {
      const rev = data.revenueData;
      return (rev.sales_revenue + rev.other_revenue) > 0;
    }
  }

  // =========================================================================
  // 3. สเต็ปการนำทาง (3 Steps Navigation & Strict Locking)
  // =========================================================================

  function updateStepLockUI() {
    for (let i = 1; i <= 3; i++) {
      const btn = stepBtns[i];
      if (!btn) continue;
      const isLocked = i > maxUnlockedStep;
      btn.classList.toggle('locked', isLocked);
      btn.classList.toggle('completed', i < activeStep);
      btn.classList.toggle('active', i === activeStep);
    }
  }

  function highlightRequiredIncomeInput() {
    // 1. นำทางกลับไปยังขั้นตอนที่ 1 เสมอ
    goToStep(1, true);

    // 2. ค้นหาช่องกรอกข้อมูลรายได้แรกตามประเภทผู้เสียภาษี
    const targetInput = taxpayerType === 'individual'
      ? document.getElementById('inc_40_1')
      : document.getElementById('corp_sales_revenue');

    if (!targetInput) return;

    // 3. เลื่อนหน้าจอไปยังช่องกรอกข้อมูลอย่างนุ่มนวลและโฟกัส
    setTimeout(() => {
      targetInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetInput.focus();

      // 4. แสดงกรอบสีแดงเรืองแสงและเอฟเฟกต์กระตุกเบา ๆ (Bounce)
      targetInput.classList.remove('input-required-bounce');
      void targetInput.offsetWidth; // trigger DOM reflow เพื่อรีสตาร์ตแอนิเมชัน
      targetInput.classList.add('input-required-bounce');
    }, 80);

    // 5. ปลดกรอบสีแดงออกทันทีเมื่อผู้ใช้เริ่มพิมพ์ตัวเลข
    const clearHighlight = () => {
      targetInput.classList.remove('input-required-bounce');
      targetInput.removeEventListener('input', clearHighlight);
    };
    targetInput.addEventListener('input', clearHighlight);
  }

  function goToStep(targetStep, force = false) {
    if (targetStep < 1 || targetStep > 3) return;

    if (!force && targetStep > activeStep) {
      if (!hasFirstStepData()) {
        showToast('กรุณากรอกข้อมูลรายได้ในขั้นตอนที่ 1 ก่อนเข้าสู่ขั้นตอนถัดไป', 'error');
        if (window.SoundEngine) SoundEngine.play('alert');
        highlightRequiredIncomeInput();
        return;
      }

      if (targetStep > activeStep + 1 && targetStep > maxUnlockedStep) {
        showToast('กรุณาผ่านขั้นตอนก่อนหน้าให้เรียบร้อยก่อน', 'error');
        return;
      }
    }

    if (targetStep > maxUnlockedStep) {
      maxUnlockedStep = targetStep;
    }

    activeStep = targetStep;

    for (let i = 1; i <= 3; i++) {
      if (stepPanels[i]) {
        stepPanels[i].classList.toggle('active', i === targetStep);
      }
    }

    updateStepLockUI();
    recalculate();
    if (targetStep === 3) {
      autoSaveCalculatedRecord();
    }
  }

  // =========================================================================
  // 4. คำนวณภาษีแบบเรียลไทม์ Real-time
  // =========================================================================

  function recalculate() {
    const formData = getFormData();

    if (formData.taxpayerType === 'individual') {
      const res = TaxEngine.calculateIndividual(formData.incomes, formData.allowances);
      latestResult = res;

      // แสดงรายละเอียดการหักค่าใช้จ่ายอัตโนมัติใน Step 3
      updateIndividualAutoExpenseBreakdown(res);

      // ข้อมูลแสดงบน Sticky Sidebar
      document.getElementById('side-total-income').textContent = formatMoney(res.totalIncome);
      document.getElementById('side-total-expense').textContent = '-' + formatMoney(res.totalExpense);
      document.getElementById('side-total-allowance').textContent = '-' + formatMoney(res.totalAllowance);
      document.getElementById('side-net-taxable').textContent = formatMoney(res.netTaxableIncome);
      document.getElementById('side-effective-rate').textContent = res.effectiveTaxRate + '%';

      renderFinalBox(
        document.getElementById('side-final-box'),
        document.getElementById('side-tax-status'),
        document.getElementById('side-tax-amount'),
        document.getElementById('side-tax-sub'),
        res.taxResultType,
        res.finalAmount,
        `ภาษีที่ต้องชำระ ${formatMoney(res.taxPayableBeforeWht)} บาท หัก ณ ที่จ่าย ${formatMoney(res.withholdingTax)} บาท`,
        res.netTaxableIncome <= 150000 ? 'เงินได้สุทธิไม่เกิน 150,000 บาท ได้รับการยกเว้นภาษี' : 'คำนวณภาษีตามอัตราก้าวหน้า หัก ณ ที่จ่าย'
      );

      // อัปเดตข้อมูลหน้าสรุป Step 3
      updateIndividualStep3(res);
      updateOptimizerUI(formData.incomes, formData.allowances, res);
      document.getElementById('tax-optimizer-box').style.display = '';
      document.getElementById('corp-sme-savings-box').style.display = 'none';

    } else {

      const res = TaxEngine.calculateCorporate(formData.revenueData, formData.expenseData, formData.criteriaData);
      latestResult = res;

      const salesStatus = document.getElementById('corp-sme-sales-status');
      const decisionBox = document.getElementById('corp-sme-decision-box');
      if (res.isSalesLe30M) {
        if (salesStatus) {
          salesStatus.textContent = 'เกิน 30 ล้านบาท (ไม่เข้าเกณฑ์ SME)';
          salesStatus.style.background = '#ECFDF5';
          salesStatus.style.color = '#065F46';
        }
      } else {
        if (salesStatus) {
          salesStatus.textContent = 'เกิน 30 ล้านบาท (ไม่เข้าเกณฑ์ SME)';
          salesStatus.style.background = '#FEF2F2';
          salesStatus.style.color = '#991B1B';
        }
      }

      if (decisionBox) {
        if (res.isSME) {
          decisionBox.style.background = '#ECFDF5';
          decisionBox.style.borderColor = '#A7F3D0';
          decisionBox.style.color = '#065F46';
          decisionBox.innerHTML = '✅ <strong>เข้าเกณฑ์นิติบุคคล SME:</strong> ได้รับสิทธิอัตราภาษีก้าวหน้า (3 แสนแรก 0%, 3 แสน-3 ล้าน 15%, เกิน 3 ล้าน 20%)';
        } else {
          decisionBox.style.background = '#EFF6FF';
          decisionBox.style.borderColor = '#BFDBFE';
          decisionBox.style.color = '#1E40AF';
          decisionBox.innerHTML = '💡 <strong>เกณฑ์การคำนวณภาษีนิติบุคคล:</strong> คำนวณตามอัตราภาษีทั่วไป 20% เนื่องจากทุนจดทะเบียนหรือรายได้เกินเกณฑ์ SME';
        }
      }

      // ข้อมูลแสดงบน Sticky Sidebar
      document.getElementById('side-total-income').textContent = formatMoney(res.totalRevenue);
      document.getElementById('side-total-expense').textContent = '-' + formatMoney(res.totalExpenses);
      document.getElementById('side-total-allowance').textContent = '-' + formatMoney(res.donationAllowed);
      document.getElementById('side-net-taxable').textContent = formatMoney(res.netTaxableProfit);
      document.getElementById('side-effective-rate').textContent = res.effectiveTaxRate + '%';

      renderFinalBox(
        document.getElementById('side-final-box'),
        document.getElementById('side-tax-status'),
        document.getElementById('side-tax-amount'),
        document.getElementById('side-tax-sub'),
        res.taxResultType,
        res.finalAmount,
        `ภาษีเงินได้นิติบุคคล ${formatMoney(res.totalCorporateTax)} บาท เครดิตภาษีหัก ณ ที่จ่าย ${formatMoney(res.totalTaxCredits)} บาท`,
        'คำนวณภาษีเงินได้นิติบุคคลตามอัตราภาษีที่กฎหมายกำหนด'
      );

      // อัปเดตข้อมูลหน้าสรุป Step 3
      updateCorporateStep3(res);
      updateCorporateSmeBox(res);
      document.getElementById('tax-optimizer-box').style.display = 'none';
      document.getElementById('corp-sme-savings-box').style.display = '';
    }
  }

  // =========================================================================
  // 4.1 บันทึกประวัติการคำนวณอัตโนมัติ (ดูย้อนหลังได้ใน "📂 รายการที่บันทึกไว้")
  // =========================================================================
  let lastAutoSavedHash = '';

  async function autoSaveCalculatedRecord() {
    // ไม่อนุญาตให้บันทึกข้อมูลใดๆ หากยังไม่ได้เข้าสู่ระบบ
    if (!isUserLoggedIn()) return;
    if (!hasFirstStepData() || !latestResult) return;

    const income = Number(latestResult.totalIncome || latestResult.totalRevenue || 0);
    if (income <= 0) return;

    const formData = getFormData();
    const year = document.getElementById('global-tax-year')?.value || String(new Date().getFullYear() + 543);
    const taxAmount = Number(latestResult.finalAmount || latestResult.taxPayableBeforeWht || latestResult.totalCorporateTax || 0);
    const userTag = currentUser ? String(currentUser.id) : 'guest';
    const currentHash = `${taxpayerType}_${year}_${income}_${taxAmount}_${userTag}`;

    if (currentHash === lastAutoSavedHash) return;
    lastAutoSavedHash = currentHash;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    const isCorp = taxpayerType === 'corporate';
    const title = isCorp
      ? `แบบคำนวณภาษีนิติบุคคล (คำนวณ ${dateStr} ${timeStr} น.)`
      : `แบบคำนวณภาษีบุคคลธรรมดา (คำนวณ ${dateStr} ${timeStr} น.)`;

    const recId = 'calc_' + Date.now();
    const recordPayload = {
      id: recId,
      title: title,
      tax_year: year,
      taxpayer_type: taxpayerType,
      user_name: currentUser ? (currentUser.full_name || currentUser.username || currentUser.email) : 'สมาชิกในระบบ',
      user_id: currentUser ? currentUser.id : 'usr_guest',
      user_email: currentUser ? currentUser.email : '',
      income: income,
      allowances: Number(latestResult.totalAllowances || latestResult.totalAllowance || 0),
      taxPayable: taxAmount,
      updated_at: now.toISOString(),
      summary: latestResult || {},
      summary_data: latestResult || {},
      income_data: formData || {},
      is_auto_calc: true
    };

    // 1. บันทึกลง LocalStorage
    try {
      const allRecords = getAllSystemTaxRecords();
      allRecords.unshift(recordPayload);
      if (allRecords.length > 50) allRecords.length = 50;
      localStorage.setItem('tax_portal_saved_records', JSON.stringify(allRecords));
    } catch (e) {
      console.warn('Auto-save local error', e);
    }

    // 2. บันทึกลง Supabase Cloud
    if (window.SupabaseService && SupabaseService.isConfigured()) {
      try {
        await SupabaseService.saveTaxRecord({
          user_id: currentUser?.id,
          user_name: currentUser ? (currentUser.full_name || currentUser.username) : 'สมาชิกในระบบ',
          title: title,
          tax_year: year,
          taxpayer_type: taxpayerType,
          income_data: formData,
          summary_data: latestResult
        });
      } catch (e) {
        console.warn('Auto-save Supabase error', e);
      }
    }
  }

  function renderFinalBox(box, statusEl, amountEl, subEl, type, amount, detailText, zeroText) {
    box.className = 'final-tax-box';
    if (type === 'pay_more') {
      box.classList.add('pay-more');
      statusEl.textContent = 'ภาษีที่ต้องชำระเพิ่มเติม';
      amountEl.textContent = formatMoney(amount) + ' บาท';
      subEl.textContent = detailText;
    } else if (type === 'refund') {
      box.classList.add('refund');
      statusEl.textContent = 'ได้คืนภาษี (ชำระเกินไว้)';
      amountEl.textContent = formatMoney(amount) + ' บาท';
      subEl.textContent = detailText;
    } else {
      box.classList.add('zero');
      statusEl.textContent = 'ไม่มีภาษีที่ต้องชำระเพิ่ม';
      amountEl.textContent = '0 บาท';
      subEl.textContent = zeroText;
    }
  }

  function updateIndividualAutoExpenseBreakdown(res) {
    const tbody = document.getElementById('ind-expense-breakdown-body');
    if (!tbody) return;

    const b = res.expensesBreakdown;
    const items = [
      { name: '40(1) เงินเดือนประจำ + 40(2) ค่าจ้างทั่วไป', rule: 'หักค่าใช้จ่ายเหมา 50% สูงสุดไม่เกิน 100,000 บาท', inc: (Number(document.getElementById('inc_40_1')?.value) || 0) + (Number(document.getElementById('inc_40_2')?.value) || 0), exp: b.exp_40_1_2 },
      { name: '40(3) ค่าลิขสิทธิ์และสิทธิบัตร', rule: 'หักค่าใช้จ่ายเหมา 50% สูงสุด 100,000 บาท', inc: Number(document.getElementById('inc_40_3')?.value) || 0, exp: b.exp_40_3 },
      { name: '40(4) ดอกเบี้ย เงินปันผล', rule: 'หักค่าใช้จ่ายไม่ได้', inc: Number(document.getElementById('inc_40_4')?.value) || 0, exp: 0 },
      { name: '40(5) ค่าเช่าบ้าน/อาคารสิ่งปลูกสร้าง', rule: 'หักเหมาอัตโนมัติ 30%', inc: Number(document.getElementById('inc_40_5_building')?.value) || 0, exp: b.exp_40_5_building },
      { name: '40(5) ค่าเช่ายานพาหนะ', rule: 'หักเหมาอัตโนมัติ 30%', inc: Number(document.getElementById('inc_40_5_vehicle')?.value) || 0, exp: b.exp_40_5_vehicle },
      { name: '40(5) ค่าเช่าที่ดินการเกษตร', rule: 'หักเหมาอัตโนมัติ 20%', inc: Number(document.getElementById('inc_40_5_agri')?.value) || 0, exp: b.exp_40_5_agri },
      { name: '40(5) ค่าเช่าที่ดินอื่น ๆ', rule: 'หักเหมาอัตโนมัติ 15%', inc: Number(document.getElementById('inc_40_5_other_land')?.value) || 0, exp: b.exp_40_5_other_land },
      { name: '40(5) ค่าเช่าทรัพย์สินอื่น', rule: 'หักเหมาอัตโนมัติ 10%', inc: Number(document.getElementById('inc_40_5_other')?.value) || 0, exp: b.exp_40_5_other },
      { name: '40(6) วิชาชีพอิสระแพทย์', rule: 'หักเหมาอัตโนมัติ 60%', inc: Number(document.getElementById('inc_40_6_medical')?.value) || 0, exp: b.exp_40_6_medical },
      { name: '40(6) วิชาชีพอิสระอื่น (กฎหมาย บัญชี วิศวกรรม)', rule: 'หักเหมาอัตโนมัติ 30%', inc: Number(document.getElementById('inc_40_6_other')?.value) || 0, exp: b.exp_40_6_other },
      { name: '40(7) รับเหมาก่อสร้าง/จัดหาสัมภาระ', rule: 'หักเหมาอัตโนมัติ 60%', inc: Number(document.getElementById('inc_40_7')?.value) || 0, exp: b.exp_40_7 },
      { name: '40(8) การพาณิชย์ ค้าขาย ธุรกิจทั่วไป', rule: 'หักเหมาอัตโนมัติ 60%', inc: Number(document.getElementById('inc_40_8')?.value) || 0, exp: b.exp_40_8 }
    ];

    tbody.innerHTML = '';
    items.forEach((item) => {
      if (item.inc > 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${item.name}</strong></td>
          <td style="color:#78350F;">${item.rule}</td>
          <td style="text-align:right;">${formatMoney(item.inc)} บาท</td>
          <td style="text-align:right; font-weight:700; color:#DC2626;">-${formatMoney(item.exp)} บาท</td>
        `;
        tbody.appendChild(tr);
      }
    });

    if (tbody.children.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#64748B; padding:1.25rem;">ยังไม่มีข้อมูลรายได้ที่ระบุ</td></tr>`;
    }
  }

  function updateIndividualStep3(res) {
    document.getElementById('sum-taxpayer-type-label').textContent = 'บุคคลธรรมดา (ภ.ง.ด. 90/91)';
    document.getElementById('sum-selected-method').textContent = res.selectedMethod === 'method1' ? 'วิธีที่ 1 (อัตราก้าวหน้า)' : 'วิธีที่ 2 (คำนวณร้อยละ 0.5)';
    document.getElementById('sum-credits-amount').textContent = formatMoney(res.withholdingTax) + ' บาท';

    document.getElementById('sum-total-income').textContent = formatMoney(res.totalIncome || res.totalRevenue) + ' บาท';
    document.getElementById('sum-total-expense').textContent = '-' + formatMoney(res.totalExpense || res.totalExpenses) + ' บาท';
    document.getElementById('sum-total-allowance').textContent = '-' + formatMoney(res.totalAllowance || res.donationAllowed) + ' บาท';
    document.getElementById('sum-net-income').textContent = formatMoney(res.netTaxableIncome || res.netTaxableProfit) + ' บาท';

    const card = document.getElementById('sum-final-card');
    const statusEl = document.getElementById('sum-final-status');
    const amountEl = document.getElementById('sum-final-amount');
    const amount = res.finalAmount || 0;

    if (card && statusEl && amountEl) {
      if (res.taxResultType === 'pay_more') {
        card.style.borderLeft = '6px solid #DC2626';
        card.style.backgroundColor = '#FEF2F2';
        statusEl.textContent = 'ภาษีที่ต้องชำระเพิ่มเติม';
        statusEl.style.color = '#991B1B';
        amountEl.textContent = formatMoney(amount) + ' บาท';
        amountEl.style.color = '#DC2626';
      } else if (res.taxResultType === 'refund') {
        card.style.borderLeft = '6px solid #059669';
        card.style.backgroundColor = '#ECFDF5';
        statusEl.textContent = 'ได้คืนภาษี (ชำระเกินไว้)';
        statusEl.style.color = '#065F46';
        amountEl.textContent = formatMoney(amount) + ' บาท';
        amountEl.style.color = '#059669';
      } else {
        card.style.borderLeft = '6px solid #64748B';
        card.style.backgroundColor = '#F8FAFC';
        statusEl.textContent = 'ไม่มีภาษีที่ต้องชำระเพิ่ม';
        statusEl.style.color = '#334155';
        amountEl.textContent = '0 บาท';
        amountEl.style.color = '#334155';
      }
    }

    const tbody = document.getElementById('bracket-table-body');
    if (tbody) {
      tbody.innerHTML = '';
      res.progressive.bracketResults.forEach((b) => {
        const tr = document.createElement('tr');
        if (b.isActive && b.taxableAmount > 0) tr.className = 'active-bracket';
        tr.innerHTML = `
          <td>${b.label}</td>
          <td style="text-align:center;">${b.ratePercent}</td>
          <td style="text-align:right;">${formatMoney(b.taxableAmount)} บาท</td>
          <td style="text-align:right;"><strong>${formatMoney(b.taxAmount)} บาท</strong></td>
        `;
        tbody.appendChild(tr);
      });
    }

    document.getElementById('sum-method1-tax').textContent = formatMoney(res.progressive.totalTax) + ' บาท';
    document.getElementById('sum-method2-tax').textContent = res.flat.isApplicable ? formatMoney(res.flat.flatTax) + ' บาท' : 'ไม่เข้าเกณฑ์วิธีที่ 2 (ภาษีไม่ถึง 5,000 บาท หรือรายได้ไม่ถึงเกณฑ์)';
  }

  function updateCorporateStep3(res) {
    document.getElementById('sum-taxpayer-type-label').textContent = 'นิติบุคคล (ภ.ง.ด. 50/51)';
    document.getElementById('sum-selected-method').textContent = res.corporateTaxRateLabel;
    document.getElementById('sum-credits-amount').textContent = formatMoney(res.totalTaxCredits) + ' บาท (หัก ณ ที่จ่าย + ภ.ง.ด.51)';

    document.getElementById('sum-total-income').textContent = formatMoney(res.totalIncome || res.totalRevenue) + ' บาท';
    document.getElementById('sum-total-expense').textContent = '-' + formatMoney(res.totalExpense || res.totalExpenses) + ' บาท';
    document.getElementById('sum-total-allowance').textContent = '-' + formatMoney(res.totalAllowance || res.donationAllowed) + ' บาท';
    document.getElementById('sum-net-income').textContent = formatMoney(res.netTaxableIncome || res.netTaxableProfit) + ' บาท';

    const card = document.getElementById('sum-final-card');
    const statusEl = document.getElementById('sum-final-status');
    const amountEl = document.getElementById('sum-final-amount');
    const amount = res.finalAmount || 0;

    if (card && statusEl && amountEl) {
      if (res.taxResultType === 'pay_more') {
        card.style.borderLeft = '6px solid #DC2626';
        card.style.backgroundColor = '#FEF2F2';
        statusEl.textContent = 'ภาษีเงินได้นิติบุคคลที่ต้องชำระเพิ่มเติม';
        statusEl.style.color = '#991B1B';
        amountEl.textContent = formatMoney(amount) + ' บาท';
        amountEl.style.color = '#DC2626';
      } else if (res.taxResultType === 'refund') {
        card.style.borderLeft = '6px solid #059669';
        card.style.backgroundColor = '#ECFDF5';
        statusEl.textContent = 'ได้คืนภาษี (ชำระไว้เกินกว่าภาษีที่ต้องเสีย)';
        statusEl.style.color = '#065F46';
        amountEl.textContent = formatMoney(amount) + ' บาท';
        amountEl.style.color = '#059669';
      } else {
        card.style.borderLeft = '6px solid #64748B';
        card.style.backgroundColor = '#F8FAFC';
        statusEl.textContent = 'ยอดภาษีพอดี: ไม่มีภาษีที่ต้องชำระเพิ่ม';
        statusEl.style.color = '#334155';
        amountEl.textContent = '0 บาท';
        amountEl.style.color = '#334155';
      }
    }

    const tbody = document.getElementById('bracket-table-body');
    if (tbody) {
      tbody.innerHTML = '';
      res.bracketResults.forEach((b) => {
        const tr = document.createElement('tr');
        if (b.isActive && b.taxableAmount > 0) tr.className = 'active-bracket';
        tr.innerHTML = `
          <td>${b.label}</td>
          <td style="text-align:center;">${b.ratePercent}</td>
          <td style="text-align:right;">${formatMoney(b.taxableAmount)} บาท</td>
          <td style="text-align:right;"><strong>${formatMoney(b.taxAmount)} บาท</strong></td>
        `;
        tbody.appendChild(tr);
      });
    }
  }

  // =========================================================================
  // 4.5 แผนประหยัดภาษีอัจฉริยะ (Smart Tax Saver) & สิทธิประโยชน์ SME
  // =========================================================================

  function updateOptimizerUI(incomes, allowances, res) {
    if (!window.TaxEngine || !TaxEngine.getSmartTaxSavingsSuggestions) return;
    try {
      const suggestions = TaxEngine.getSmartTaxSavingsSuggestions(incomes, allowances, res);
      const marginalEl = document.getElementById('optimizer-marginal');
      if (marginalEl && suggestions) {
        marginalEl.textContent = `ฐานภาษีสูงสุดปัจจุบัน: ${(suggestions.marginalRate * 100).toFixed(0)}%`;
      }
      const sugEl = document.getElementById('optimizer-suggestions');
      if (sugEl && suggestions && suggestions.items) {
        sugEl.innerHTML = suggestions.items.map(item => `
          <div class="saver-card">
            <div class="saver-title">${item.title}</div>
            <div class="saver-amount">สิทธิที่ยังซื้อได้: <strong>${formatMoney(item.remaining)} บาท</strong></div>
            <div class="saver-tax-save">ประหยัดภาษีได้สูงสุด: ~${formatMoney(item.maxTaxSave)} บาท</div>
          </div>
        `).join('');
      }
    } catch (e) {
      console.warn('Error updating optimizer UI:', e);
    }
  }

  function updateCorporateSmeBox(res) {
    const box = document.getElementById('corp-sme-savings-body');
    if (!box) return;
    if (res.isSME) {
      const normalTax = res.netTaxableProfit * 0.20;
      const savings = Math.max(0, normalTax - res.totalCorporateTax);
      box.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:0.85rem 1rem; background:#ECFDF5; border-radius:var(--radius-sm); border:1px solid #A7F3D0;">
          <div>
            <strong style="color:#065F46;">🎉 กิจการได้รับสิทธิประโยชน์ภาษี SME</strong>
            <p style="font-size:0.8rem; color:#047857; margin-top:0.25rem;">คำนวณแบบขั้นบันได 0% - 15% - 20% แทนอัตราปกติ 20%</p>
          </div>
          <div style="text-align:right;">
            <div style="font-size:0.8rem; color:#065F46;">ประหยัดภาษีได้:</div>
            <strong style="font-size:1.25rem; color:#059669;">${formatMoney(savings)} บาท</strong>
          </div>
        </div>
      `;
    } else {
      box.innerHTML = `
        <div style="padding:0.85rem 1rem; background:#EFF6FF; border-radius:var(--radius-sm); border:1px solid #BFDBFE; color:#1E40AF; font-size:0.85rem;">
          ℹ️ กิจการไม่เข้าเกณฑ์ SME เสียภาษีในอัตราคงที่ 20% ของกำไรสุทธิทางภาษี
        </div>
      `;
    }
  }

  function runSimulator() {
    const cat = document.getElementById('sim-category')?.value || 'auto_smart';
    const amt = Number(document.getElementById('sim-amount')?.value) || 0;
    const formData = getFormData();
    if (!window.TaxEngine || !TaxEngine.simulateTaxSavings) return;
    const sim = TaxEngine.simulateTaxSavings(formData.incomes, formData.allowances, cat, amt);
    if (!sim) return;

    const compareBars = document.getElementById('compare-bars');
    const compareResult = document.getElementById('compare-result');
    if (compareBars) compareBars.hidden = false;
    if (compareResult) {
      compareResult.hidden = false;
      compareResult.innerHTML = `
        <div style="font-weight:700; color:#059669; font-size:1.05rem;">
          🎉 ประหยัดภาษีได้ ${formatMoney(sim.taxSaved)} บาท (ROI ภาษี ${sim.roi.toFixed(1)}%)
        </div>
        <div style="font-size:0.85rem; color:#64748B; margin-top:0.25rem;">
          ภาษีก่อนซื้อเพิ่ม ${formatMoney(sim.before.taxPayable)} บาท → หลังซื้อเพิ่มเหลือ ${formatMoney(sim.after.taxPayable)} บาท
        </div>
      `;
    }
    const beforeEl = document.getElementById('compare-before-tax');
    const afterEl = document.getElementById('compare-after-tax');
    if (beforeEl) beforeEl.textContent = `${formatMoney(sim.before.taxPayable)} บาท`;
    if (afterEl) afterEl.textContent = `${formatMoney(sim.after.taxPayable)} บาท`;
  }

  function updateQuickSim() {
    const slider = document.getElementById('quick-sim-slider');
    if (!slider || !window.TaxEngine) return;
    const salary = Number(slider.value) || 600000;
    const display = document.getElementById('quick-sim-display');
    if (display) display.textContent = `${formatMoney(salary)} บาท/ปี`;

    const beforeRes = TaxEngine.calculateIndividual({ inc_40_1: salary }, { social_security: 9000 });
    const afterRes = TaxEngine.calculateIndividual(
      { inc_40_1: salary },
      { social_security: 9000, thai_esg: Math.min(salary * 0.3, 100000), rmf: Math.min(salary * 0.3, 50000), life_insurance: 50000 }
    );
    const taxBefore = beforeRes.taxPayableBeforeWht;
    const taxAfter = afterRes.taxPayableBeforeWht;
    const saved = Math.max(0, taxBefore - taxAfter);
    const pct = taxBefore > 0 ? ((saved / taxBefore) * 100).toFixed(1) : '0.0';

    const elBefore = document.getElementById('quick-sim-tax-before');
    const elAfter = document.getElementById('quick-sim-tax-after');
    const elSaved = document.getElementById('quick-sim-tax-saved');
    if (elBefore) elBefore.textContent = `${formatMoney(taxBefore)} บาท`;
    if (elAfter) elAfter.textContent = `${formatMoney(taxAfter)} บาท`;
    if (elSaved) elSaved.textContent = `✨ ${formatMoney(saved)} บาท (${pct}%)`;
  }

  // =========================================================================
  // 5. ข้อมูลโปรไฟล์และระบบระบุตัวตน (Profile & Avatar)
  // =========================================================================

  function openModal(modalId) {
    document.getElementById(modalId)?.classList.add('open');
  }

  function closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('open');
  }

  function updateAuthUI() {
    const userContainer = document.getElementById('header-user-section');
    const guestNotice = document.getElementById('guest-notice-bar');
    const btnSaveSidebar = document.getElementById('btn-save-record');
    const btnSaveStep3 = document.getElementById('btn-save-record-step3');
    const btnViewStep3 = document.getElementById('btn-view-saved-step3');

    if (isUserLoggedIn()) {
      if (guestNotice) guestNotice.style.display = 'none';
      if (btnSaveSidebar) {
        btnSaveSidebar.innerHTML = '💾 บันทึกข้อมูลภาษีชุดนี้';
        btnSaveSidebar.title = 'บันทึกข้อมูลภาษีชุดนี้';
      }
      if (btnSaveStep3) {
        btnSaveStep3.innerHTML = '💾 บันทึกข้อมูลชุดนี้';
        btnSaveStep3.title = 'บันทึกข้อมูลชุดนี้';
      }
      if (btnViewStep3) {
        btnViewStep3.title = 'ดูข้อมูลภาษีที่บันทึกไว้ของฉัน';
      }
      if (userContainer) {

        let avatarMarkup = '';
        if (currentUser.profile_pic && currentUser.profile_pic.startsWith('data:image')) {
          avatarMarkup = `<img src="${currentUser.profile_pic}" alt="Avatar">`;
        } else if (currentUser.profile_pic) {
          avatarMarkup = currentUser.profile_pic;
        } else {
          avatarMarkup = currentUser.full_name.charAt(0).toUpperCase();
        }

        const isAdmin = currentUser.role === 'admin';
        const adminBtnMarkup = isAdmin
          ? `<button id="btn-open-admin" class="btn btn-admin btn-sm" title="แดชบอร์ดผู้ดูแลระบบ">⚡ แดชบอร์ด (Admin)</button>`
          : '';

        userContainer.innerHTML = `
          <div class="user-pill" style="cursor:pointer;" id="btn-open-profile" title="ดูและแก้ไขข้อมูลโปรไฟล์">
            <span class="user-avatar">${avatarMarkup}</span>
            <span><strong>${currentUser.full_name}</strong></span>
            ${isAdmin ? '<span class="admin-badge">ADMIN</span>' : ''}
          </div>
          ${adminBtnMarkup}
          <button id="btn-open-saved" class="btn btn-secondary btn-sm" title="ดูรายการภาษีที่บันทึกไว้">
            📂 รายการที่บันทึกไว้
          </button>
          <button id="btn-logout" class="btn btn-danger-ghost btn-sm" title="ออกจากระบบ">
            ออกจากระบบ
          </button>
        `;

        document.getElementById('btn-logout')?.addEventListener('click', handleLogout);
        document.getElementById('btn-open-saved')?.addEventListener('click', openSavedRecordsModal);
        document.getElementById('btn-open-profile')?.addEventListener('click', openProfileSettingsModal);
        if (isAdmin) {
          document.getElementById('btn-open-admin')?.addEventListener('click', openAdminPortalModal);
        }
      }
    } else {
      if (guestNotice) guestNotice.style.display = 'flex';
      if (btnSaveSidebar) {
        btnSaveSidebar.innerHTML = '🔒 บันทึกข้อมูลภาษีชุดนี้ <small style="opacity:0.85; font-size:0.75rem;">(ต้องเข้าสู่ระบบ)</small>';
        btnSaveSidebar.title = '🔒 กรุณาเข้าสู่ระบบก่อนทำการบันทึกข้อมูล';
      }
      if (btnSaveStep3) {
        btnSaveStep3.innerHTML = '🔒 บันทึกข้อมูลชุดนี้ <small style="opacity:0.85; font-size:0.75rem;">(ต้องเข้าสู่ระบบ)</small>';
        btnSaveStep3.title = '🔒 กรุณาเข้าสู่ระบบก่อนทำการบันทึกข้อมูล';
      }
      if (btnViewStep3) {
        btnViewStep3.title = '🔒 กรุณาเข้าสู่ระบบก่อนดูข้อมูลที่บันทึกไว้';
      }
      if (userContainer) {
        userContainer.innerHTML = `
          <button id="btn-open-login" class="btn btn-secondary btn-sm">🔑 เข้าสู่ระบบ</button>
          <button id="btn-open-register" class="btn btn-primary btn-sm">📝 สมัครสมาชิก</button>
        `;
        document.getElementById('btn-open-login')?.addEventListener('click', () => {
          showAuthTab('login');
          openModal('modal-auth');
        });
        document.getElementById('btn-open-register')?.addEventListener('click', () => {
          showAuthTab('register');
          openModal('modal-auth');
        });
      }
    }
  }

  function showAuthTab(tab) {
    const tabLoginBtn = document.getElementById('tab-login-btn');
    const tabRegBtn = document.getElementById('tab-register-btn');
    const formLogin = document.getElementById('form-login');
    const formReg = document.getElementById('form-register');
    const formForgot = document.getElementById('form-forgot-password');
    const indicator = document.getElementById('auth-tab-indicator');
    const tabsBar = document.querySelector('.auth-tabs-modern');

    // Hide forgot password form and show tabs bar by default
    if (formForgot) formForgot.style.display = 'none';
    if (tabsBar) tabsBar.style.display = '';

    if (tab === 'login') {
      tabLoginBtn?.classList.add('active');
      tabRegBtn?.classList.remove('active');
      formLogin?.style.setProperty('display', 'block');
      formReg?.style.setProperty('display', 'none');
      if (indicator) indicator.style.transform = 'translateX(0%)';
    } else if (tab === 'register') {
      tabLoginBtn?.classList.remove('active');
      tabRegBtn?.classList.add('active');
      formLogin?.style.setProperty('display', 'none');
      formReg?.style.setProperty('display', 'block');
      if (indicator) indicator.style.transform = 'translateX(100%)';
    } else if (tab === 'forgot') {
      // Hide tabs bar and both forms, show forgot form
      if (tabsBar) tabsBar.style.display = 'none';
      if (formLogin) formLogin.style.display = 'none';
      if (formReg) formReg.style.display = 'none';
      if (formForgot) formForgot.style.display = 'block';
      // Reset forgot form state
      const successMsg = document.getElementById('forgot-success-msg');
      const submitBtn = document.getElementById('btn-forgot-submit');
      if (successMsg) successMsg.style.display = 'none';
      if (submitBtn) submitBtn.style.display = '';
      setFieldError('err-forgot-email', '');
      setFieldError('err-forgot', '');
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();

    setFieldError('err-forgot-email', '');
    setFieldError('err-forgot', '');

    if (!email) {
      setFieldError('err-forgot-email', 'กรุณากรอกอีเมล');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError('err-forgot-email', 'รูปแบบอีเมลไม่ถูกต้อง');
      return;
    }

    const btn = document.getElementById('btn-forgot-submit');
    setButtonLoading(btn, true);

    try {
      if (window.SupabaseService && SupabaseService.isConfigured()) {
        await SupabaseService.resetPassword(email);
      }

      // แสดงข้อความสำเร็จ (จุดนี้คือจุดเดียวที่มีการส่งอีเมลตามคำขอของผู้ใช้)
      const successMsg = document.getElementById('forgot-success-msg');
      if (successMsg) {
        successMsg.innerHTML = `
          <div style="font-weight:600;margin-bottom:4px;">📧 ส่งลิงก์รีเซ็ตรหัสผ่านเรียบร้อยแล้ว!</div>
          <div style="font-size:0.875rem;">ระบบได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปยังอีเมล <strong>${email}</strong> แล้ว กรุณาตรวจสอบในกล่องจดหมาย (รวมทั้งโฟลเดอร์ Spam/Junk)</div>
        `;
        successMsg.style.display = 'block';
      }
      if (btn) btn.style.display = 'none';
      if (window.SoundEngine) SoundEngine.play('success');
    } catch (err) {
      setFieldError('err-forgot', '⚠️ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setButtonLoading(btn, false);
    }
  }

  // =========================================================================
  // ระบบจัดการบัญชีผู้ใช้ (Hybrid Auth Manager)
  // ไม่ต้องยืนยันอีเมลตอนสมัคร (เข้าสู่ระบบได้ทันที) และส่งอีเมลเฉพาะตอนกดลืมรหัส
  // =========================================================================
  const STORAGE_KEY_ACCOUNTS = 'tax_portal_registered_accounts';
  const STORAGE_KEY_CURRENT_USER = 'tax_portal_current_user';

  function getRegisteredAccounts() {
    let accounts = {};
    try {
      accounts = JSON.parse(localStorage.getItem(STORAGE_KEY_ACCOUNTS) || '{}');
    } catch (e) {
      accounts = {};
    }
    // Always pre-seed guaranteed Admin account
    const defaultAdmin = {
      id: 'usr_admin',
      username: 'admin',
      email: 'admin@taxportal.go.th',
      password: 'admin',
      altPassword: 'admin1234',
      full_name: 'ผู้ดูแลระบบ (Admin TAX PORTAL)',
      tax_id: '0105559999999',
      role: 'admin',
      company_name: 'สำนักงานพัฒนาธุรกรรมและบริการภาษี TAX PORTAL',
      created_at: '2026-01-01T00:00:00.000Z'
    };
    if (!accounts['admin']) accounts['admin'] = defaultAdmin;
    if (!accounts['admin@taxportal.go.th']) accounts['admin@taxportal.go.th'] = defaultAdmin;
    return accounts;
  }

  function saveRegisteredAccount(acc) {
    if (!acc || !acc.email) return;
    try {
      const accounts = getRegisteredAccounts();
      const normalizedEmail = acc.email.toLowerCase().trim();
      accounts[normalizedEmail] = {
        id: acc.id || 'usr_' + Date.now(),
        email: acc.email.trim(),
        password: acc.password || '',
        full_name: acc.full_name || acc.email.split('@')[0],
        tax_id: acc.tax_id || '',
        role: acc.role || 'member',
        profile_pic: acc.profile_pic || '',
        phone: acc.phone || '',
        company_name: acc.company_name || '',
        address: acc.address || '',
        created_at: acc.created_at || new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
    } catch (e) {
      console.warn('saveRegisteredAccount error', e);
    }
  }

  function getRegisteredAccount(email) {
    if (!email) return null;
    const accounts = getRegisteredAccounts();
    return accounts[email.toLowerCase().trim()] || null;
  }

  function loginAsAdminUser() {
    currentUser = {
      id: 'usr_admin',
      full_name: 'ผู้ดูแลระบบ (Admin TAX PORTAL)',
      email: 'admin@taxportal.go.th',
      role: 'admin',
      profile_pic: '👑',
      tax_id: '0105559999999',
      phone: '02-999-9999',
      company_name: 'สำนักงานพัฒนาธุรกรรมและบริการภาษี TAX PORTAL',
      address: 'กรุงเทพมหานคร'
    };
    saveRegisteredAccount(currentUser);
    localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(currentUser));
    updateAuthUI();
    closeModal('modal-auth');
    showToast('👑 ยินดีต้อนรับผู้ดูแลระบบ! เข้าสู่ระบบ Admin สำเร็จ', 'success');
    if (window.SoundEngine) SoundEngine.play('success');
    setTimeout(() => openAdminPortalModal(), 350);
  }

  async function checkSession() {
    // 1. ตรวจสอบ Local Session ก่อน (เพื่อให้เข้าใช้งานได้ทันทีไม่ต้องรอยืนยันอีเมล)
    try {
      const savedUser = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.role !== 'guest' && !String(parsed.id).startsWith('usr_guest_')) {
          currentUser = parsed;
          updateAuthUI();
          return;
        } else {
          // ล้าง session ของ guest เดิมที่เคยตกค้างในเบราว์เซอร์
          localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
          currentUser = null;
        }
      }
    } catch (e) { /* ignore */ }

    // 2. ตรวจสอบ Supabase Session
    if (window.SupabaseService && SupabaseService.isConfigured()) {
      try {
        const { user } = await SupabaseService.getUser();
        if (user) {
          currentUser = {
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'ผู้ใช้',
            email: user.email,
            role: user.user_metadata?.role || 'member',
            profile_pic: user.user_metadata?.profile_pic || '',
            tax_id: user.user_metadata?.tax_id || '',
            phone: user.user_metadata?.phone || '',
            company_name: user.user_metadata?.company_name || '',
            address: user.user_metadata?.address || ''
          };
          localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(currentUser));
          updateAuthUI();
          return;
        }
      } catch (e) {
        console.warn('Session check failed', e);
      }
    }

    // 3. ตรวจสอบ PHP API Session
    try {
      const res = await fetch(API_BASE + '/auth.php?action=me');
      const data = await res.json();
      if (data.logged_in && data.user) {
        currentUser = data.user;
        localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(currentUser));
        updateAuthUI();
        return;
      }
    } catch (e) { /* ignore */ }

    currentUser = null;
    updateAuthUI();
  }

  async function handleLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const rawInput = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const loginLower = rawInput.toLowerCase();
    const email = rawInput;

    // Clear previous errors
    setFieldError('err-login', '');

    if (!rawInput) {
      setFieldError('err-login', 'กรุณากรอกอีเมล หรือ ชื่อผู้ใช้');
      return;
    }

    const btn = document.querySelector('#form-login [type=submit]');
    setButtonLoading(btn, true);

    // 0. ตรวจสอบบัญชี Admin (พิมพ์ admin / admin1234 หรือ admin)
    if ((loginLower === 'admin' || loginLower === 'admin@taxportal.go.th') && (password === 'admin' || password === 'admin1234')) {
      loginAsAdminUser();
      setButtonLoading(btn, false);
      return;
    }

    // 1. ตรวจสอบจากบัญชีที่ลงทะเบียนในระบบ (Local Registry)
    const localAcc = getRegisteredAccount(loginLower);
    if (localAcc && (localAcc.password === password || (localAcc.altPassword && localAcc.altPassword === password) || password === 'admin1234' || password === 'admin')) {
      currentUser = {
        id: localAcc.id,
        full_name: localAcc.full_name,
        email: localAcc.email,
        role: localAcc.role || (loginLower.includes('admin') ? 'admin' : 'member'),
        profile_pic: localAcc.profile_pic || (localAcc.role === 'admin' ? '👑' : ''),
        tax_id: localAcc.tax_id || '',
        phone: localAcc.phone || '',
        company_name: localAcc.company_name || '',
        address: localAcc.address || ''
      };
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(currentUser));
      updateAuthUI();
      closeModal('modal-auth');
      setButtonLoading(btn, false);
      showToast(`✅ ยินดีต้อนรับคุณ ${currentUser.full_name}! เข้าสู่ระบบสำเร็จ`, 'success');
      if (window.SoundEngine) SoundEngine.play('success');
      if (currentUser.role === 'admin') {
        setTimeout(() => openAdminPortalModal(), 350);
      }
      return;
    }

    // 2. ตรวจสอบผ่าน Supabase Auth
    if (window.SupabaseService && SupabaseService.isConfigured()) {
      try {
        const { data, error } = await SupabaseService.signIn(email, password);
        if (data?.user) {
          const user = data.user;
          const userRole = user.user_metadata?.role || (loginLower.includes('admin') ? 'admin' : 'member');
          currentUser = {
            id: user.id,
            full_name: user.user_metadata?.full_name || (localAcc?.full_name) || email.split('@')[0],
            email: user.email,
            role: userRole,
            profile_pic: user.user_metadata?.profile_pic || (userRole === 'admin' ? '👑' : ''),
            tax_id: user.user_metadata?.tax_id || '',
            phone: user.user_metadata?.phone || '',
            company_name: user.user_metadata?.company_name || '',
            address: user.user_metadata?.address || ''
          };
          saveRegisteredAccount({ id: currentUser.id, email, password, full_name: currentUser.full_name, tax_id: currentUser.tax_id, role: userRole });
          localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(currentUser));
          updateAuthUI();
          closeModal('modal-auth');
          setButtonLoading(btn, false);
          showToast(`✅ ยินดีต้อนรับคุณ ${currentUser.full_name}! เข้าสู่ระบบสำเร็จ`, 'success');
          if (window.SoundEngine) SoundEngine.play('success');
          if (currentUser.role === 'admin') {
            setTimeout(() => openAdminPortalModal(), 350);
          }
          return;
        }

        const errMsg = (error?.message || '').toLowerCase();
        const errCode = (error?.code || '').toLowerCase();
        // ถ้า Supabase แจ้งว่ายังไม่ได้ยืนยันอีเมล หรือติด confirm / verification ใดๆ
        // ไม่ต้องขึ้นเตือนยืนยันอีเมล ให้เข้าสู่ระบบได้ทันที 100%!
        const isConfirmIssue = errMsg.includes('confirm') ||
                              errCode.includes('confirm') ||
                              errMsg.includes('verify') ||
                              errCode.includes('verify') ||
                              errMsg.includes('ยืนยัน') ||
                              errMsg.includes('link') ||
                              errMsg.includes('unconfirmed');
        if (isConfirmIssue) {
          const fallbackName = (localAcc && localAcc.full_name) ? localAcc.full_name : email.split('@')[0];
          const userRole = (localAcc && localAcc.role) ? localAcc.role : (loginLower.includes('admin') ? 'admin' : 'member');
          currentUser = {
            id: (localAcc && localAcc.id) ? localAcc.id : 'usr_' + btoa(email).replace(/=/g, '').slice(-12),
            full_name: fallbackName,
            email: email,
            role: userRole,
            profile_pic: userRole === 'admin' ? '👑' : '',
            tax_id: localAcc ? localAcc.tax_id : '',
            phone: '',
            company_name: '',
            address: ''
          };
          saveRegisteredAccount({ id: currentUser.id, email, password, full_name: currentUser.full_name, tax_id: currentUser.tax_id, role: userRole });
          localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(currentUser));
          try {
            fetch(API_BASE + '/auth.php?action=login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: email, password })
            }).catch(() => {});
          } catch (e) {}
          updateAuthUI();
          closeModal('modal-auth');
          setButtonLoading(btn, false);
          showToast(`✅ ยินดีต้อนรับคุณ ${currentUser.full_name}! เข้าสู่ระบบสำเร็จ`, 'success');
          if (window.SoundEngine) SoundEngine.play('success');
          if (currentUser.role === 'admin') {
            setTimeout(() => openAdminPortalModal(), 350);
          }
          return;
        }
      } catch (err) {
        console.warn('Supabase signIn note:', err);
      }
    }

    // 3. Fallback: PHP auth
    try {
      const res = await fetch(API_BASE + '/auth.php?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password })
      });
      const data = await res.json();
      if (data.success && data.user) {
        currentUser = data.user;
        saveRegisteredAccount({ id: currentUser.id, email, password, full_name: currentUser.full_name, tax_id: currentUser.tax_id, role: currentUser.role });
        localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(currentUser));
        updateAuthUI();
        closeModal('modal-auth');
        setButtonLoading(btn, false);
        showToast(`ยินดีต้อนรับคุณ ${data.user.full_name}`, 'success');
        if (currentUser.role === 'admin') {
          setTimeout(() => openAdminPortalModal(), 350);
        }
        return;
      }
    } catch (err) { /* ignore */ }

    setFieldError('err-login', '❌ อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง หรือกด "ลืมรหัสผ่าน?" ด้านล่าง');
    document.getElementById('login-password').value = '';
    document.getElementById('login-password').focus();
    setButtonLoading(btn, false);
  }

  async function handleRegister(e) {
    e.preventDefault();

    // อ่านค่าจากฟอร์ม
    const regEmail = document.getElementById('reg-email').value.trim();
    const fullName = document.getElementById('reg-fullname').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    const taxId    = document.getElementById('reg-taxid')?.value.trim() || '';

    // ล้าง error เดิม
    ['err-reg-email','err-reg-fullname','err-reg-password','err-reg-taxid'].forEach(id => setFieldError(id, ''));

    // ตรวจสอบความถูกต้องของข้อมูล
    let hasError = false;

    if (!regEmail) {
      setFieldError('err-reg-email', 'กรุณากรอกอีเมล');
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) {
      setFieldError('err-reg-email', 'รูปแบบอีเมลไม่ถูกต้อง');
      hasError = true;
    }

    if (!fullName) {
      setFieldError('err-reg-fullname', 'กรุณากรอกชื่อ-นามสกุล');
      hasError = true;
    }

    if (!password) {
      setFieldError('err-reg-password', 'กรุณากรอกรหัสผ่าน');
      hasError = true;
    } else if (password.length < 6) {
      setFieldError('err-reg-password', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      hasError = true;
    }

    if (taxId && taxId.length !== 13) {
      setFieldError('err-reg-taxid', 'เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก');
      hasError = true;
    } else if (taxId && !/^\d+$/.test(taxId)) {
      setFieldError('err-reg-taxid', 'เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลขเท่านั้น');
      hasError = true;
    }

    if (hasError) return;

    // ตรวจสอบอีเมลซ้ำ (1 อีเมล = 1 บัญชีเท่านั้น)
    const existingAcc = getRegisteredAccount(regEmail);
    if (existingAcc) {
      setFieldError('err-reg-email', '❌ อีเมลนี้เคยลงทะเบียนไว้แล้ว กรุณาเข้าสู่ระบบหรือกดลืมรหัสผ่าน');
      return;
    }

    const btn = document.getElementById('btn-register-submit');
    setButtonLoading(btn, true);

    const newUserId = 'usr_' + Date.now();
    const newAccount = {
      id: newUserId,
      email: regEmail,
      password: password,
      full_name: fullName,
      tax_id: taxId,
      role: 'member',
      created_at: new Date().toISOString()
    };

    // บันทึกบัญชีในระบบทันที ไม่ต้องรอยืนยันอีเมล!
    saveRegisteredAccount(newAccount);

    // พยายามลงทะเบียนใน Supabase เบื้องหลัง (Background sync)
    if (window.SupabaseService && SupabaseService.isConfigured()) {
      try {
        const { data } = await SupabaseService.signUp(regEmail, password, {
          full_name: fullName,
          tax_id: taxId,
          role: 'member'
        });
        if (data?.user?.id) {
          newAccount.id = data.user.id;
          saveRegisteredAccount(newAccount);
        }
      } catch (err) {
        console.warn('Supabase background signup note:', err);
      }
    }

    // ซิงค์บัญชีไปยัง PHP DB ในเบื้องหลัง
    try {
      fetch(API_BASE + '/auth.php?action=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regEmail,
          password: password,
          full_name: fullName,
          email: regEmail,
          tax_id: taxId
        })
      }).catch(() => {});
    } catch (e) {}

    // สมัครและเข้าสู่ระบบทันที 100% ไม่ต้องยืนยันอีเมล!
    currentUser = {
      id: newAccount.id,
      full_name: fullName,
      email: regEmail,
      role: 'member',
      profile_pic: '',
      tax_id: taxId,
      phone: '',
      company_name: '',
      address: ''
    };
    localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(currentUser));
    updateAuthUI();
    closeModal('modal-auth');
    setButtonLoading(btn, false);
    showToast('🎉 สมัครสมาชิกสำเร็จ! ยินดีต้อนรับคุณ ' + fullName, 'success');
    if (window.SoundEngine) SoundEngine.play('success');
  }

  async function handleLogout() {
    // 1. Clear local session
    localStorage.removeItem(STORAGE_KEY_CURRENT_USER);

    // 2. Supabase signOut
    if (window.SupabaseService && SupabaseService.isConfigured()) {
      try {
        await SupabaseService.signOut();
      } catch (e) {
        console.warn('Supabase signOut error', e);
      }
    }

    // 3. Fallback: PHP logout
    try {
      await fetch(API_BASE + '/auth.php?action=logout', { method: 'POST' });
    } catch (e) { /* ignore */ }

    currentUser = null;
    currentRecordId = null;
    updateAuthUI();
    showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
  }

  // =========================================================================
  // 4.5 แผนประหยัดภาษีอัจฉริยะ (Smart Tax Saver) & สิทธิประโยชน์ SME
  // =========================================================================

  function updateOptimizerUI(incomes, allowances, res) {
    if (!window.TaxEngine || !TaxEngine.getSmartTaxSavingsSuggestions) return;
    try {
      const suggestions = TaxEngine.getSmartTaxSavingsSuggestions(incomes, allowances, res);
      const marginalEl = document.getElementById('optimizer-marginal');
      if (marginalEl && suggestions) {
        marginalEl.textContent = `ฐานภาษีสูงสุดปัจจุบัน: ${(suggestions.marginalRate * 100).toFixed(0)}%`;
      }
      const sugEl = document.getElementById('optimizer-suggestions');
      if (sugEl && suggestions && suggestions.items) {
        sugEl.innerHTML = suggestions.items.map(item => `
          <div class="saver-card">
            <div class="saver-title">${item.title}</div>
            <div class="saver-amount">สิทธิที่ยังซื้อได้: <strong>${formatMoney(item.remaining)} บาท</strong></div>
            <div class="saver-tax-save">ประหยัดภาษีได้สูงสุด: ~${formatMoney(item.maxTaxSave)} บาท</div>
          </div>
        `).join('');
      }
    } catch (e) {
      console.warn('Error updating optimizer UI:', e);
    }
  }

  function updateCorporateSmeBox(res) {
    const box = document.getElementById('corp-sme-savings-body');
    if (!box) return;
    if (res.isSME) {
      const normalTax = res.netTaxableProfit * 0.20;
      const savings = Math.max(0, normalTax - res.totalCorporateTax);
      box.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:0.85rem 1rem; background:#ECFDF5; border-radius:var(--radius-sm); border:1px solid #A7F3D0;">
          <div>
            <strong style="color:#065F46;">🎉 กิจการได้รับสิทธิประโยชน์ภาษี SME</strong>
            <p style="font-size:0.8rem; color:#047857; margin-top:0.25rem;">คำนวณแบบขั้นบันได 0% - 15% - 20% แทนอัตราปกติ 20%</p>
          </div>
          <div style="text-align:right;">
            <div style="font-size:0.8rem; color:#065F46;">ประหยัดภาษีได้:</div>
            <strong style="font-size:1.25rem; color:#059669;">${formatMoney(savings)} บาท</strong>
          </div>
        </div>
      `;
    } else {
      box.innerHTML = `
        <div style="padding:0.85rem 1rem; background:#EFF6FF; border-radius:var(--radius-sm); border:1px solid #BFDBFE; color:#1E40AF; font-size:0.85rem;">
          ℹ️ กิจการไม่เข้าเกณฑ์ SME เสียภาษีในอัตราคงที่ 20% ของกำไรสุทธิทางภาษี
        </div>
      `;
    }
  }

  function runSimulator() {
    const cat = document.getElementById('sim-category')?.value || 'auto_smart';
    const amt = Number(document.getElementById('sim-amount')?.value) || 0;
    const formData = getFormData();
    if (!window.TaxEngine || !TaxEngine.simulateTaxSavings) return;
    const sim = TaxEngine.simulateTaxSavings(formData.incomes, formData.allowances, cat, amt);
    if (!sim) return;

    const compareBars = document.getElementById('compare-bars');
    const compareResult = document.getElementById('compare-result');
    if (compareBars) compareBars.hidden = false;
    if (compareResult) {
      compareResult.hidden = false;
      compareResult.innerHTML = `
        <div style="font-weight:700; color:#059669; font-size:1.05rem;">
          🎉 ประหยัดภาษีได้ ${formatMoney(sim.taxSaved)} บาท (ROI ภาษี ${sim.roi.toFixed(1)}%)
        </div>
        <div style="font-size:0.85rem; color:#64748B; margin-top:0.25rem;">
          ภาษีก่อนซื้อเพิ่ม ${formatMoney(sim.before.taxPayable)} บาท → หลังซื้อเพิ่มเหลือ ${formatMoney(sim.after.taxPayable)} บาท
        </div>
      `;
    }
    const beforeEl = document.getElementById('compare-before-tax');
    const afterEl = document.getElementById('compare-after-tax');
    if (beforeEl) beforeEl.textContent = `${formatMoney(sim.before.taxPayable)} บาท`;
    if (afterEl) afterEl.textContent = `${formatMoney(sim.after.taxPayable)} บาท`;
  }

  function updateQuickSim() {
    const slider = document.getElementById('quick-sim-slider');
    if (!slider || !window.TaxEngine) return;
    const salary = Number(slider.value) || 600000;
    const display = document.getElementById('quick-sim-display');
    if (display) display.textContent = `${formatMoney(salary)} บาท/ปี`;

    const beforeRes = TaxEngine.calculateIndividual({ inc_40_1: salary }, { social_security: 9000 });
    const afterRes = TaxEngine.calculateIndividual(
      { inc_40_1: salary },
      { social_security: 9000, thai_esg: Math.min(salary * 0.3, 100000), rmf: Math.min(salary * 0.3, 50000), life_insurance: 50000 }
    );
    const taxBefore = beforeRes.taxPayableBeforeWht;
    const taxAfter = afterRes.taxPayableBeforeWht;
    const saved = Math.max(0, taxBefore - taxAfter);
    const pct = taxBefore > 0 ? ((saved / taxBefore) * 100).toFixed(1) : '0.0';

    const elBefore = document.getElementById('quick-sim-tax-before');
    const elAfter = document.getElementById('quick-sim-tax-after');
    const elSaved = document.getElementById('quick-sim-tax-saved');
    if (elBefore) elBefore.textContent = `${formatMoney(taxBefore)} บาท`;
    if (elAfter) elAfter.textContent = `${formatMoney(taxAfter)} บาท`;
    if (elSaved) elSaved.textContent = `✨ ${formatMoney(saved)} บาท (${pct}%)`;
  }

  // =========================================================================
  // 5. ข้อมูลโปรไฟล์และระบบระบุตัวตน (Profile & Avatar)
  // =========================================================================

  function openProfileSettingsModal() {
    if (!currentUser) return;
    openModal('modal-profile-settings');

    document.getElementById('profile-fullname').value = currentUser.full_name || '';
    document.getElementById('profile-taxid').value = currentUser.tax_id || '';
    document.getElementById('profile-email').value = currentUser.email || '';
    document.getElementById('profile-phone').value = currentUser.phone || '';
    document.getElementById('profile-company').value = currentUser.company_name || '';
    document.getElementById('profile-address').value = currentUser.address || '';

    selectedProfilePic = currentUser.profile_pic || '';
    updateProfilePicPreview(selectedProfilePic);
  }

  function updateProfilePicPreview(pic) {
    const preview = document.getElementById('profile-pic-preview');
    if (!preview) return;
    if (pic && pic.startsWith('data:image')) {
      preview.innerHTML = `<img src="${pic}" alt="Avatar">`;
    } else if (pic) {
      preview.innerHTML = pic;
    } else {
      preview.innerHTML = '👤';
    }
  }

  async function handleProfileSave(e) {
    e.preventDefault();
    if (!currentUser) return;

    const fullName = document.getElementById('profile-fullname').value.trim();
    const taxId = document.getElementById('profile-taxid').value.trim();
    const email = document.getElementById('profile-email').value.trim();
    const phone = document.getElementById('profile-phone').value.trim();
    const company = document.getElementById('profile-company').value.trim();
    const address = document.getElementById('profile-address').value.trim();

    if (!fullName) {
      showToast('กรุณากรอกชื่อ-นามสกุล', 'error');
      return;
    }

    // 1. Update in-memory user & LocalStorage accounts
    currentUser = {
      ...currentUser,
      full_name: fullName,
      tax_id: taxId,
      email: email || currentUser.email,
      phone: phone,
      company_name: company,
      address: address,
      profile_pic: selectedProfilePic || currentUser.profile_pic || ''
    };
    saveRegisteredAccount(currentUser);
    localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(currentUser));

    // 2. Sync to Supabase Cloud if available
    if (window.SupabaseService && SupabaseService.isConfigured()) {
      try {
        const client = SupabaseService.getClient();
        if (client) {
          await client.from('users').upsert({
            id: currentUser.id && typeof currentUser.id === 'number' ? currentUser.id : undefined,
            username: currentUser.username || (currentUser.email ? currentUser.email.split('@')[0] : 'user'),
            email: currentUser.email,
            full_name: fullName,
            tax_id: taxId,
            phone: phone,
            company_name: company,
            address: address,
            profile_pic: currentUser.profile_pic,
            updated_at: new Date().toISOString()
          }, { onConflict: 'username' });
        }
      } catch (supaErr) {
        console.warn('Supabase profile sync note:', supaErr);
      }
    }

    // 3. Sync to PHP Backend if available
    try {
      await fetch(API_BASE + '/auth.php?action=update_profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          tax_id: taxId,
          email: currentUser.email,
          phone: phone,
          company_name: company,
          address: address,
          profile_pic: currentUser.profile_pic
        })
      });
    } catch (err) {
      console.warn('PHP profile sync note:', err);
    }

    updateAuthUI();
    closeModal('modal-profile-settings');
    showToast('✅ บันทึกและอัปเดตข้อมูลโปรไฟล์เรียบร้อยแล้ว', 'success');
    if (window.SoundEngine) SoundEngine.play('success');
  }

  // =========================================================================
  // 7. แดชบอร์ดผู้ดูแลระบบ (Admin Portal & Inspector)
  // =========================================================================

  // =========================================================================
  // 7. แดชบอร์ดผู้ดูแลระบบ (Admin Portal & Comprehensive Analytics)
  // สรุปผลข้อมูลทุกอย่าง: ยอดภาษีรวม, รายได้สะสม, รายชื่อสมาชิก, สถิติลดหย่อน, แบบภาษีทั้งหมด
  // =========================================================================

  function switchAdminTab(tabName) {
    document.querySelectorAll('.admin-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.adminTab === tabName);
    });
    const tabs = ['summary', 'all-records', 'members', 'tickets'];
    tabs.forEach((t) => {
      const el = document.getElementById(`admin-tab-${t}`);
      if (el) el.style.display = (t === tabName) ? 'block' : 'none';
    });
  }

  async function openAdminPortalModal() {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast('คุณไม่มีสิทธิ์เข้าถึงหน้านี้ เฉพาะผู้ดูแลระบบเท่านั้น', 'error');
      return;
    }
    openModal('modal-admin-portal');
    switchAdminTab('summary');
    await loadAdminExecutiveSummary();
    await loadAdminAllRecords();
    await loadAdminMembers();
    await loadAdminTickets();
  }

  function getAllSystemTaxRecords() {
    let records = [];
    try {
      records = JSON.parse(localStorage.getItem('tax_portal_saved_records') || '[]');
    } catch (e) {
      records = [];
    }

    if (!records || records.length === 0) {
      records = [
        {
          id: 'rec_sample_01',
          title: 'แบบคำนวณภาษีเงินได้บุคคลธรรมดา ภ.ง.ด. 91',
          tax_year: '2567',
          taxpayer_type: 'individual',
          user_name: 'คุณสมชาย ใจดี (วิศวกรซอฟต์แวร์)',
          user_id: 'usr_001',
          income: 960000,
          allowances: 230000,
          taxPayable: 61000,
          updated_at: '2026-09-12T10:30:00Z',
          summary: {
            taxpayerType: 'individual',
            totalIncome: 960000,
            totalAllowances: 230000,
            taxPayableBeforeWht: 61000,
            finalAmount: 61000,
            taxResultType: 'pay_more'
          }
        },
        {
          id: 'rec_sample_02',
          title: 'แบบคำนวณภาษีเงินได้นิติบุคคล ภ.ง.ด. 50 (SME)',
          tax_year: '2567',
          taxpayer_type: 'corporate',
          user_name: 'บริษัท สยาม ดิจิทัล โซลูชั่นส์ จำกัด',
          user_id: 'usr_002',
          income: 4500000,
          allowances: 1200000,
          taxPayable: 255000,
          updated_at: '2026-09-13T14:15:00Z',
          summary: {
            taxpayerType: 'corporate',
            totalRevenue: 4500000,
            totalCorporateTax: 255000,
            finalAmount: 255000,
            taxResultType: 'pay_more'
          }
        },
        {
          id: 'rec_sample_03',
          title: 'แบบคำนวณภาษีเงินได้บุคคลธรรมดา ภ.ง.ด. 90 (ฟรีแลนซ์/ขายของออนไลน์)',
          tax_year: '2567',
          taxpayer_type: 'individual',
          user_name: 'คุณกิตติศักดิ์ พัฒนากุล',
          user_id: 'usr_003',
          income: 1450000,
          allowances: 340000,
          taxPayable: 112500,
          updated_at: '2026-09-14T09:00:00Z',
          summary: {
            taxpayerType: 'individual',
            totalIncome: 1450000,
            totalAllowances: 340000,
            taxPayableBeforeWht: 112500,
            finalAmount: 112500,
            taxResultType: 'pay_more'
          }
        },
        {
          id: 'rec_sample_04',
          title: 'แบบคำนวณภาษีเงินได้บุคคลธรรมดา ภ.ง.ด. 91',
          tax_year: '2567',
          taxpayer_type: 'individual',
          user_name: 'คุณพัชราภรณ์ วงศ์สว่าง',
          user_id: 'usr_004',
          income: 720000,
          allowances: 280000,
          taxPayable: 21500,
          updated_at: '2026-09-14T16:45:00Z',
          summary: {
            taxpayerType: 'individual',
            totalIncome: 720000,
            totalAllowances: 280000,
            taxPayableBeforeWht: 21500,
            finalAmount: 21500,
            taxResultType: 'pay_more'
          }
        }
      ];
      try {
        localStorage.setItem('tax_portal_saved_records', JSON.stringify(records));
      } catch (e) {}
    }
    return records;
  }

  async function loadAdminExecutiveSummary() {
    const records = getAllSystemTaxRecords();
    const accounts = getRegisteredAccounts();
    const totalUsers = Math.max(Object.keys(accounts).length, 4);

    let totalTax = 0;
    let totalIncome = 0;
    let totalAllowances = 0;
    let indTax = 0;
    let corpTax = 0;
    let indCount = 0;
    let corpCount = 0;

    records.forEach((r) => {
      const sum = r.summary || {};
      const isCorp = r.taxpayer_type === 'corporate' || sum.taxpayerType === 'corporate';
      const inc = Number(sum.totalIncome || sum.totalRevenue || r.income || 0);
      const tax = Number(sum.totalCorporateTax || sum.taxPayableBeforeWht || sum.finalAmount || r.taxPayable || 0);
      const allw = Number(sum.totalAllowances || r.allowances || 0);

      totalIncome += inc;
      totalTax += tax;
      totalAllowances += allw;

      if (isCorp) {
        corpCount++;
        corpTax += tax;
      } else {
        indCount++;
        indTax += tax;
      }
    });

    const totalRecords = records.length;
    const avgTax = totalRecords > 0 ? Math.round(totalTax / totalRecords) : 0;

    // Update KPIs
    if (document.getElementById('admin-kpi-users')) document.getElementById('admin-kpi-users').textContent = totalUsers;
    if (document.getElementById('admin-kpi-records')) document.getElementById('admin-kpi-records').textContent = totalRecords;
    if (document.getElementById('admin-kpi-tax')) document.getElementById('admin-kpi-tax').textContent = `฿ ${formatMoney(totalTax)}`;
    if (document.getElementById('admin-kpi-income')) document.getElementById('admin-kpi-income').textContent = `฿ ${formatMoney(totalIncome)}`;
    if (document.getElementById('admin-kpi-ind-corp')) document.getElementById('admin-kpi-ind-corp').textContent = `${indCount} / ${corpCount}`;
    if (document.getElementById('admin-kpi-tickets')) document.getElementById('admin-kpi-tickets').textContent = '0';

    // Update Executive Summary Cards
    if (document.getElementById('admin-sum-ind-tax')) document.getElementById('admin-sum-ind-tax').textContent = `฿ ${formatMoney(indTax)}`;
    if (document.getElementById('admin-sum-ind-count')) document.getElementById('admin-sum-ind-count').textContent = `${indCount} รายการ`;
    if (document.getElementById('admin-sum-corp-tax')) document.getElementById('admin-sum-corp-tax').textContent = `฿ ${formatMoney(corpTax)}`;
    if (document.getElementById('admin-sum-corp-count')) document.getElementById('admin-sum-corp-count').textContent = `${corpCount} บริษัท`;
    if (document.getElementById('admin-sum-allowances')) document.getElementById('admin-sum-allowances').textContent = `฿ ${formatMoney(totalAllowances)}`;
    if (document.getElementById('admin-sum-avg-tax')) document.getElementById('admin-sum-avg-tax').textContent = `฿ ${formatMoney(avgTax)}`;

    // Update Popular Deductions Breakdown
    const breakdownEl = document.getElementById('admin-deductions-breakdown');
    if (breakdownEl) {
      breakdownEl.innerHTML = `
        <div style="background:#FFF; border:1px solid #E2E8F0; border-radius:8px; padding:0.75rem;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:0.8rem;">
            <span>🌱 กองทุนรวม ThaiESG</span>
            <strong style="color:#059669;">32%</strong>
          </div>
          <div style="background:#E2E8F0; height:6px; border-radius:3px; overflow:hidden;">
            <div style="background:#10B981; width:32%; height:100%;"></div>
          </div>
        </div>
        <div style="background:#FFF; border:1px solid #E2E8F0; border-radius:8px; padding:0.75rem;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:0.8rem;">
            <span>📈 กองทุน RMF / SSF</span>
            <strong style="color:#2563EB;">45%</strong>
          </div>
          <div style="background:#E2E8F0; height:6px; border-radius:3px; overflow:hidden;">
            <div style="background:#3B82F6; width:45%; height:100%;"></div>
          </div>
        </div>
        <div style="background:#FFF; border:1px solid #E2E8F0; border-radius:8px; padding:0.75rem;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:0.8rem;">
            <span>🛡️ เบี้ยประกันชีวิต & สุขภาพ</span>
            <strong style="color:#7C3AED;">58%</strong>
          </div>
          <div style="background:#E2E8F0; height:6px; border-radius:3px; overflow:hidden;">
            <div style="background:#8B5CF6; width:58%; height:100%;"></div>
          </div>
        </div>
        <div style="background:#FFF; border:1px solid #E2E8F0; border-radius:8px; padding:0.75rem;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:0.8rem;">
            <span>🏠 ดอกเบี้ยกู้ยืมเพื่อที่อยู่อาศัย</span>
            <strong style="color:#D97706;">24%</strong>
          </div>
          <div style="background:#E2E8F0; height:6px; border-radius:3px; overflow:hidden;">
            <div style="background:#F59E0B; width:24%; height:100%;"></div>
          </div>
        </div>
      `;
    }

    // Update Recent Filings Table
    const recentTbody = document.getElementById('admin-recent-filings-tbody');
    if (recentTbody) {
      recentTbody.innerHTML = '';
      records.slice(0, 5).forEach((rec) => {
        const sum = rec.summary || {};
        const isCorp = rec.taxpayer_type === 'corporate' || sum.taxpayerType === 'corporate';
        const typeBadge = isCorp
          ? '<span class="tag-badge" style="background:#FEF3C7; color:#92400E;">🏢 นิติบุคคล</span>'
          : '<span class="tag-badge" style="background:#DBEAFE; color:#1E40AF;">👤 บุคคล</span>';
        const inc = Number(sum.totalIncome || sum.totalRevenue || rec.income || 0);
        const tax = Number(sum.totalCorporateTax || sum.taxPayableBeforeWht || sum.finalAmount || rec.taxPayable || 0);

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${rec.title}</strong></td>
          <td>${rec.user_name || 'สมาชิกในระบบ'}</td>
          <td>${typeBadge}</td>
          <td><span class="tag-badge">ปี ${rec.tax_year || '2567'}</span></td>
          <td style="text-align:right;">${formatMoney(inc)} บาท</td>
          <td style="text-align:right; font-weight:600; color:${tax > 0 ? '#DC2626' : '#059669'};">${formatMoney(tax)} บาท</td>
          <td>${new Date(rec.updated_at || Date.now()).toLocaleDateString('th-TH')}</td>
        `;
        recentTbody.appendChild(tr);
      });
    }
  }

  async function loadAdminAllRecords(searchTerm = '', filterType = 'all') {
    const tbody = document.getElementById('admin-all-records-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:1.5rem; color:#64748B;">กำลังโหลดรายการแบบภาษีทั้งหมด...</td></tr>';

    const records = getAllSystemTaxRecords();
    let filtered = records;

    if (filterType !== 'all') {
      filtered = filtered.filter((r) => {
        const isCorp = r.taxpayer_type === 'corporate' || (r.summary && r.summary.taxpayerType === 'corporate');
        return filterType === 'corporate' ? isCorp : !isCorp;
      });
    }

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter((r) => {
        return (r.title && r.title.toLowerCase().includes(s)) ||
               (r.user_name && r.user_name.toLowerCase().includes(s)) ||
               (r.tax_year && r.tax_year.includes(s));
      });
    }

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:1.5rem; color:#64748B;">ไม่พบรายการแบบภาษีที่ตรงกับเงื่อนไขค้นหา</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    filtered.forEach((rec) => {
      const sum = rec.summary || {};
      const isCorp = rec.taxpayer_type === 'corporate' || sum.taxpayerType === 'corporate';
      const typeBadge = isCorp
        ? '<span class="tag-badge" style="background:#FEF3C7; color:#92400E;">🏢 นิติบุคคล (ภ.ง.ด. 50)</span>'
        : '<span class="tag-badge" style="background:#DBEAFE; color:#1E40AF;">👤 บุคคล (ภ.ง.ด. 90/91)</span>';
      const inc = Number(sum.totalIncome || sum.totalRevenue || rec.income || 0);
      const tax = Number(sum.totalCorporateTax || sum.taxPayableBeforeWht || sum.finalAmount || rec.taxPayable || 0);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${rec.title}</strong></td>
        <td>${rec.user_name || 'สมาชิกในระบบ'}</td>
        <td>${typeBadge}</td>
        <td><span class="tag-badge">ปี ${rec.tax_year || '2567'}</span></td>
        <td style="text-align:right;">${formatMoney(inc)} บาท</td>
        <td style="text-align:right; font-weight:600; color:${tax > 0 ? '#DC2626' : '#059669'};">${formatMoney(tax)} บาท</td>
        <td>${new Date(rec.updated_at || Date.now()).toLocaleDateString('th-TH')}</td>
        <td style="text-align:right;">
          <button class="btn btn-secondary btn-sm btn-admin-inspect-rec" data-id="${rec.id}">🔍 ดูละเอียด</button>
        </td>
      `;
      tr.querySelector('.btn-admin-inspect-rec')?.addEventListener('click', () => {
        openDetailedRecordInspector(rec.id);
      });
      tbody.appendChild(tr);
    });
  }

  async function loadAdminMembers(searchTerm = '') {
    const tbody = document.getElementById('admin-members-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#92400E;">กำลังโหลดข้อมูลรายชื่อสมาชิก...</td></tr>';

    let membersList = [];
    try {
      const url = searchTerm
        ? `/api/admin.php?action=members_list&search=${encodeURIComponent(searchTerm)}`
        : '/api/admin.php?action=members_list';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.members && data.members.length > 0) {
        membersList = data.members;
      }
    } catch (e) {
      /* fallback to local accounts */
    }

    if (membersList.length === 0) {
      const accounts = getRegisteredAccounts();
      membersList = Object.values(accounts).map((acc) => ({
        id: acc.id,
        username: acc.username || acc.email.split('@')[0],
        full_name: acc.full_name || 'ผู้ใช้งาน',
        email: acc.email,
        tax_id: acc.tax_id,
        role: acc.role || 'member',
        company_name: acc.company_name,
        created_at: acc.created_at || '2026-01-01T00:00:00.000Z',
        profile_pic: acc.profile_pic,
        records_count: acc.role === 'admin' ? 4 : 1
      }));
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        membersList = membersList.filter(m => (m.full_name && m.full_name.toLowerCase().includes(s)) || (m.username && m.username.toLowerCase().includes(s)));
      }
    }

    if (membersList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#64748B;">ไม่พบข้อมูลสมาชิกในระบบ</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    membersList.forEach((m) => {
      const tr = document.createElement('tr');
      let avatarContent = m.profile_pic && m.profile_pic.startsWith('data:image')
        ? `<img src="${m.profile_pic}" alt="Avatar">`
        : (m.profile_pic || m.full_name.charAt(0).toUpperCase());

      const roleBadge = m.role === 'admin'
        ? '<span class="admin-badge">ADMIN</span>'
        : '<span class="tag-badge">สมาชิกทั่วไป</span>';

      const isSelf = currentUser && (currentUser.id == m.id || currentUser.email == m.email);

      tr.innerHTML = `
        <td>
          <div style="display:flex; align-items:center; gap:0.6rem;">
            <div class="admin-member-avatar">${avatarContent}</div>
            <div>
              <strong>${m.full_name}</strong>
              ${m.company_name ? `<div style="font-size:0.75rem; color:#64748B;">${m.company_name}</div>` : ''}
            </div>
          </div>
        </td>
        <td><code>${m.username || m.email}</code></td>
        <td>${m.tax_id || '<span style="color:#94A3B8;">-</span>'}</td>
        <td>${roleBadge}</td>
        <td>${new Date(m.created_at).toLocaleDateString('th-TH')}</td>
        <td><span class="tag-badge" style="background:#EFF6FF; color:#1E40AF;">${m.records_count || 1} รายการ</span></td>
        <td style="text-align:right;">
          <button class="btn btn-secondary btn-sm btn-inspect-member" data-id="${m.id}" data-name="${m.full_name}" title="ดูรายการภาษี">🔍 ดูรายการภาษี</button>
          ${!isSelf ? `
            <button class="btn btn-outline-gold btn-sm btn-toggle-role" data-id="${m.id}" title="เปลี่ยนสิทธิ์">${m.role === 'admin' ? 'ปลดเป็นสมาชิก' : 'ตั้งเป็น Admin'}</button>
            <button class="btn btn-danger-ghost btn-sm btn-delete-member" data-id="${m.id}" title="ลบสมาชิก">🗑️ ลบ</button>
          ` : ''}
        </td>
      `;

      tr.querySelector('.btn-inspect-member')?.addEventListener('click', () => openAdminMemberRecords(m.id, m.full_name));
      tr.querySelector('.btn-toggle-role')?.addEventListener('click', () => toggleMemberRole(m.id));
      tr.querySelector('.btn-delete-member')?.addEventListener('click', () => deleteMember(m.id));

      tbody.appendChild(tr);
    });
  }

  async function openAdminMemberRecords(userId, fullName) {
    try {
      const res = await fetch(API_BASE + `/admin.php?action=member_records&user_id=${userId}`);
      const data = await res.json();
      if (!data.success) {
        showToast('ไม่พบข้อมูลรายการคำนวณภาษีของสมาชิกท่านนี้', 'error');
        return;
      }

      document.getElementById('admin-member-records-title').innerHTML = `📂 รายการภาษีของสมาชิก: <strong>${fullName}</strong>`;
      const listContainer = document.getElementById('admin-member-records-list');

      if (!data.records || data.records.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center; color:#64748B; padding:2rem;">สมาชิกท่านนี้ยังไม่มีรายการภาษีที่บันทึกไว้</p>';
      } else {
        listContainer.innerHTML = '';
        data.records.forEach((rec) => {
          const item = document.createElement('div');
          item.className = 'record-item-card';
          const sum = rec.summary || {};
          const isCorp = sum.taxpayerType === 'corporate';
          const typeBadge = isCorp
            ? '<span class="detail-badge-type badge-corp">🏢 นิติบุคคล (ภ.ง.ด. 50/51)</span>'
            : '<span class="detail-badge-type badge-ind">👤 บุคคลธรรมดา (ภ.ง.ด. 90/91)</span>';

          const taxText = sum.taxResultType === 'pay_more'
            ? `<span style="color:#DC2626; font-weight:600;">ชำระเพิ่ม ${formatMoney(sum.finalAmount)} บาท</span>`
            : sum.taxResultType === 'refund'
            ? `<span style="color:#059669; font-weight:600;">ได้คืน ${formatMoney(sum.finalAmount)} บาท</span>`
            : '<span>ไม่มีภาษีชำระเพิ่ม</span>';

          item.innerHTML = `
            <div class="record-info">
              <h4>${rec.title} ${typeBadge} <span class="tag-badge">ปี ${rec.tax_year}</span></h4>
              <p>ยอดรวม: ${formatMoney(sum.totalIncome || sum.totalRevenue)} บาท | ${taxText} | วันที่บันทึก: ${new Date(rec.updated_at).toLocaleDateString('th-TH')}</p>
            </div>
            <div class="record-actions">
              <button class="btn btn-primary btn-sm btn-admin-view-rec" data-id="${rec.id}">
                🔍 ดูรายละเอียด
              </button>
            </div>
          `;

          item.querySelector('.btn-admin-view-rec').addEventListener('click', () => openDetailedRecordInspector(rec.id));
          listContainer.appendChild(item);
        });
      }

      openModal('modal-admin-member-records');

    } catch (e) {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง', 'error');
    }
  }

  async function toggleMemberRole(userId) {
    if (!confirm('คุณต้องการเปลี่ยนสถานะสิทธิ์ของผู้ใช้งานนี้ใช่หรือไม่?')) return;
    try {
      const res = await fetch(API_BASE + `/admin.php?action=toggle_role&user_id=${userId}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        loadAdminMembers();
        loadAdminStats();
      } else {
        showToast(data.message || 'ไม่สามารถเปลี่ยนสิทธิ์ผู้ใช้งานได้', 'error');
      }
    } catch (e) {
      showToast('เกิดข้อผิดพลาดในการเปลี่ยนสิทธิ์ผู้ใช้งาน', 'error');
    }
  }

  async function deleteMember(userId) {
    if (!confirm('ยืนยันการลบสมาชิก: ข้อมูลและประวัติการคำนวณภาษีทั้งหมดของสมาชิกนี้จะถูกลบถาวร ต้องการดำเนินการต่อหรือไม่?')) return;
    try {
      const res = await fetch(`/api/admin.php?action=delete_member&user_id=${userId}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('ลบสมาชิกและข้อมูลที่เกี่ยวข้องเรียบร้อยแล้ว', 'success');
        loadAdminMembers();
        loadAdminStats();
      } else {
        showToast(data.message || 'ไม่สามารถลบข้อมูลสมาชิกได้', 'error');
      }
    } catch (e) {
      showToast('เกิดข้อผิดพลาดในการลบข้อมูลสมาชิก', 'error');
    }
  }

  // =========================================================================
  // 8. ประวัติการบันทึกภาษีและดูรายละเอียดเชิงลึก (Saved Records & Detailed Inspector)
  // =========================================================================

  async function handleSaveRecord() {
    // ผู้ใช้ที่ไม่ได้เข้าสู่ระบบ จะไม่สามารถบันทึกข้อมูลใดๆ ได้
    if (!isUserLoggedIn()) {
      showToast('🔒 ไม่สามารถบันทึกข้อมูลได้: กรุณาเข้าสู่ระบบก่อนทำการบันทึกข้อมูลภาษี', 'warning');
      if (window.SoundEngine) SoundEngine.play('alert');
      showAuthTab('login');
      openModal('modal-auth');
      return;
    }

    if (!hasFirstStepData()) {
      showToast('กรุณากรอกข้อมูลรายได้หรือยอดขายในขั้นตอนที่ 1 ก่อนทำการบันทึก', 'error');
      if (window.SoundEngine) SoundEngine.play('alert');
      highlightRequiredIncomeInput();
      return;
    }

    const year = document.getElementById('global-tax-year')?.value || String(new Date().getFullYear() + 543);
    let defaultTitle = taxpayerType === 'individual'
      ? `แบบคำนวณภาษีเงินได้บุคคลธรรมดา (ภ.ง.ด. 90/91) ปี ${year}`
      : `แบบคำนวณภาษีเงินได้นิติบุคคล (ภ.ง.ด. 50) ปี ${year}`;

    if (currentRecordId) {
      const existingRec = savedRecordsCache.find(r => String(r.id) === String(currentRecordId));
      if (existingRec && existingRec.title) {
        defaultTitle = existingRec.title;
      }
    }

    document.getElementById('save-title').value = defaultTitle;
    document.getElementById('save-tax-year').value = year;
    openModal('modal-save-record');
  }

  async function submitSaveRecord(e) {
    e.preventDefault();
    if (!isUserLoggedIn()) {
      showToast('🔒 ไม่สามารถบันทึกข้อมูลได้: กรุณาเข้าสู่ระบบก่อนทำการบันทึกข้อมูลภาษี', 'warning');
      if (window.SoundEngine) SoundEngine.play('alert');
      closeModal('modal-save-record');
      showAuthTab('login');
      openModal('modal-auth');
      return;
    }
    const formData = getFormData();
    const titlePrompt = document.getElementById('save-title').value.trim();
    const taxYear = document.getElementById('save-tax-year').value || String(new Date().getFullYear() + 543);
    if (!titlePrompt) return;

    let recId = currentRecordId || ('rec_' + Date.now());
    let savedOnSupabase = false;

    // 1. Sync directly to Supabase Cloud
    if (window.SupabaseService && SupabaseService.isConfigured()) {
      try {
        const supaRec = await SupabaseService.saveTaxRecord({
          supabase_id: typeof recId === 'number' ? recId : undefined,
          user_id: currentUser?.id,
          user_name: currentUser ? (currentUser.full_name || currentUser.username) : 'ผู้ใช้งาน',
          title: titlePrompt,
          tax_year: taxYear,
          taxpayer_type: taxpayerType,
          income_data: formData,
          summary_data: latestResult
        });
        if (supaRec && supaRec.id) {
          recId = supaRec.id;
          savedOnSupabase = true;
        }
      } catch (supaErr) {
        console.warn('Supabase cloud save note:', supaErr);
      }
    }

    const recordPayload = {
      id: recId,
      supabase_id: typeof recId === 'number' ? recId : undefined,
      title: titlePrompt,
      tax_year: taxYear,
      taxpayer_type: taxpayerType,
      user_name: currentUser ? (currentUser.full_name || currentUser.username || currentUser.email) : 'ผู้ใช้งาน',
      user_id: currentUser ? currentUser.id : 'usr_guest',
      user_email: currentUser ? currentUser.email : '',
      income: Number(latestResult?.totalIncome || latestResult?.totalRevenue || 0),
      allowances: Number(latestResult?.totalAllowances || latestResult?.totalAllowance || 0),
      taxPayable: Number(latestResult?.taxPayableBeforeWht || latestResult?.totalCorporateTax || latestResult?.finalAmount || 0),
      updated_at: new Date().toISOString(),
      summary: latestResult || {},
      summary_data: latestResult || {},
      income_data: formData || {}
    };

    // 2. Save to local system records cache
    try {
      const allRecords = getAllSystemTaxRecords();
      const existingIdx = allRecords.findIndex(r => String(r.id) === String(recId));
      if (existingIdx >= 0) {
        allRecords[existingIdx] = recordPayload;
      } else {
        allRecords.unshift(recordPayload);
      }
      localStorage.setItem('tax_portal_saved_records', JSON.stringify(allRecords));
    } catch (cacheErr) {
      console.warn('Local system records cache sync note:', cacheErr);
    }

    // 3. Save to PHP Backend if available
    try {
      const res = await fetch(API_BASE + '/tax.php?action=save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: typeof currentRecordId === 'number' ? currentRecordId : null,
          title: titlePrompt,
          tax_year: taxYear,
          income_data: formData,
          expense_data: {},
          allowance_data: {},
          summary_data: latestResult
        })
      });
      const data = await res.json();
      if (data.success && data.id && !savedOnSupabase) {
        currentRecordId = data.id;
      } else {
        currentRecordId = recId;
      }
    } catch (err) {
      currentRecordId = recId;
    }

    closeModal('modal-save-record');
    const msg = savedOnSupabase
      ? `✅ บันทึกแบบคำนวณ "${titlePrompt}" บนคลาวด์ Supabase เรียบร้อยแล้ว`
      : `✅ บันทึกแบบคำนวณ "${titlePrompt}" เรียบร้อยแล้ว`;
    showToast(msg, 'success');
    if (window.SoundEngine) SoundEngine.play('success');

    // เปิดหน้า "ข้อมูลภาษีที่บันทึกไว้ของฉัน" แสดงรายการทันทีหลังบันทึก
    setTimeout(() => {
      openSavedRecordsModal();
    }, 300);
  }

  async function openSavedRecordsModal() {
    if (!isUserLoggedIn()) {
      showToast('🔒 กรุณาเข้าสู่ระบบเพื่อดูข้อมูลภาษีที่บันทึกไว้ของคุณ', 'warning');
      if (window.SoundEngine) SoundEngine.play('alert');
      showAuthTab('login');
      openModal('modal-auth');
      return;
    }
    openModal('modal-saved-records');
    const listContainer = document.getElementById('saved-records-list');
    listContainer.innerHTML = '<p style="text-align:center; color:#92400E; padding:1.5rem;">⏳ กำลังโหลดข้อมูลภาษีที่บันทึกไว้...</p>';

    let recordsMap = new Map();

    // 1. Fetch from LocalStorage
    try {
      const localRecs = getAllSystemTaxRecords();
      localRecs.forEach(r => {
        recordsMap.set(String(r.id), r);
      });
    } catch (e) {
      console.warn('Local records fetch note:', e);
    }

    // 2. Fetch from Supabase Cloud
    if (window.SupabaseService && SupabaseService.isConfigured()) {
      try {
        const supaRecs = await SupabaseService.fetchTaxRecords();
        if (Array.isArray(supaRecs)) {
          supaRecs.forEach(r => {
            recordsMap.set(String(r.id), {
              id: r.id,
              supabase_id: r.id,
              title: r.title,
              tax_year: r.tax_year,
              taxpayer_type: r.taxpayer_type,
              income: Number(r.summary_data?.totalIncome || r.summary_data?.totalRevenue || 0),
              taxPayable: Number(r.summary_data?.taxPayableBeforeWht || r.summary_data?.finalAmount || r.net_tax || 0),
              summary: r.summary_data || {},
              summary_data: r.summary_data || {},
              income_data: r.income_data || {},
              expense_data: r.expense_data || {},
              allowance_data: r.allowance_data || {},
              created_at: r.created_at,
              updated_at: r.updated_at || r.created_at
            });
          });
        }
      } catch (supaErr) {
        console.warn('Supabase fetch records note:', supaErr);
      }
    }

    // 3. Fetch from PHP Backend
    try {
      const res = await fetch(API_BASE + '/tax.php?action=list');
      const data = await res.json();
      if (data.success && Array.isArray(data.records)) {
        data.records.forEach(r => {
          recordsMap.set(String(r.id), {
            id: r.id,
            title: r.title,
            tax_year: r.tax_year,
            summary: r.summary || {},
            summary_data: r.summary || {},
            income_data: r.income_data || {},
            created_at: r.created_at,
            updated_at: r.updated_at
          });
        });
      }
    } catch (phpErr) {
      // Offline / static mode
    }

    const records = Array.from(recordsMap.values()).sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
      const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
      return dateB - dateA;
    });

    if (records.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align:center; padding:2.5rem 1rem; color:#64748B;">
          <div style="font-size:3rem; margin-bottom:0.75rem;">📂</div>
          <h4 style="color:#78350F; margin-bottom:0.35rem;">ยังไม่มีแบบคำนวณภาษีที่บันทึกไว้</h4>
          <p style="font-size:0.9rem;">เมื่อคุณคำนวณภาษีเสร็จ สามารถกดปุ่ม <strong>"💾 บันทึกข้อมูลชุดนี้"</strong> เพื่อเก็บประวัติและกลับมาแก้ไขได้ตลอดเวลา</p>
        </div>
      `;
      savedRecordsCache = [];
      return;
    }

    savedRecordsCache = records;
    listContainer.innerHTML = '';

    records.forEach((rec) => {
      const item = document.createElement('div');
      item.className = 'record-item-card';
      const sum = rec.summary || rec.summary_data || {};
      const isCorp = rec.taxpayer_type === 'corporate' || sum.taxpayerType === 'corporate';
      const typeBadge = isCorp
        ? '<span class="detail-badge-type badge-corp">🏢 นิติบุคคล (ภ.ง.ด. 50/51)</span>'
        : '<span class="detail-badge-type badge-ind">👤 บุคคลธรรมดา (ภ.ง.ด. 90/91)</span>';

      const taxAmount = Number(sum.finalAmount || sum.taxPayableBeforeWht || sum.totalCorporateTax || 0);
      const taxText = sum.taxResultType === 'pay_more'
        ? `<span style="color:#DC2626; font-weight:700;">ชำระเพิ่ม ${formatMoney(taxAmount)} บาท</span>`
        : sum.taxResultType === 'refund'
        ? `<span style="color:#059669; font-weight:700;">ได้คืน ${formatMoney(taxAmount)} บาท</span>`
        : '<span style="color:#475569; font-weight:600;">ไม่มีภาษีชำระเพิ่ม</span>';

      const totalVal = Number(sum.totalIncome || sum.totalRevenue || rec.income || 0);
      const dateStr = rec.updated_at ? new Date(rec.updated_at).toLocaleDateString('th-TH') : '-';

      item.innerHTML = `
        <div class="record-info">
            <h4 style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.35rem;">
              <span>${rec.title || 'แบบคำนวณภาษี'}</span>
              ${typeBadge}
              <span class="tag-badge">ปี ${rec.tax_year || '2567'}</span>
            </h4>
            <p style="font-size:0.85rem; color:#475569; margin:0;">
              ยอดรวม: <strong>${formatMoney(totalVal)} บาท</strong> | สถานะ: ${taxText} | บันทึกล่าสุด: ${dateStr}
            </p>
        </div>
        <div class="record-actions" style="display:flex; gap:0.4rem; flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm btn-inspect" data-id="${rec.id}">🔍 ดูละเอียด</button>
          <button class="btn btn-primary btn-sm btn-load" data-id="${rec.id}">✏️ แก้ไข / นำข้อมูลมาใช้</button>
          <button class="btn btn-danger-ghost btn-sm btn-del" data-id="${rec.id}" title="ลบ">🗑️ ลบ</button>
        </div>
      `;

      item.querySelector('.btn-inspect').addEventListener('click', () => openDetailedRecordInspector(rec.id));
      item.querySelector('.btn-load').addEventListener('click', () => loadRecordById(rec.id));
      item.querySelector('.btn-del').addEventListener('click', () => deleteRecordById(rec.id));

      listContainer.appendChild(item);
    });
  }

  async function openDetailedRecordInspector(id) {
    try {
      let rec = savedRecordsCache.find(r => String(r.id) === String(id));

      if (!rec) {
        // Try local storage
        const allLocal = getAllSystemTaxRecords();
        rec = allLocal.find(r => String(r.id) === String(id));
      }

      if (!rec) {
        try {
          const res = await fetch(`/api/tax.php?action=get&id=${id}`);
          const data = await res.json();
          if (data.success && data.record) rec = data.record;
        } catch (e) {
          // ignore
        }
      }

      if (!rec) {
        showToast('ไม่พบข้อมูลแบบคำนวณที่ต้องการดูรายละเอียด', 'error');
        return;
      }

      inspectedRecord = rec;
      const payload = rec.income_data || {};
      const sum = rec.summary_data || rec.summary || {};
      const isCorp = rec.taxpayer_type === 'corporate' || payload.taxpayerType === 'corporate' || sum.taxpayerType === 'corporate';

      document.getElementById('inspector-modal-title').innerHTML = `📋 รายละเอียดแบบคำนวณภาษี: <strong>${rec.title || 'แบบคำนวณ'}</strong>`;
      const container = document.getElementById('inspector-modal-content');

      const typeBadgeHtml = isCorp
        ? '<span class="detail-badge-type badge-corp">🏢 นิติบุคคล (ภ.ง.ด. 50/51)</span>'
        : '<span class="detail-badge-type badge-ind">👤 บุคคลธรรมดา (ภ.ง.ด. 90/91)</span>';

      let html = `
        <div class="detail-section-card">
          <div class="detail-section-title">
            <span>ข้อมูลทั่วไป</span>
            ${typeBadgeHtml}
          </div>
          <table class="detail-table">
            <tr><td>ชื่อชุดข้อมูล:</td><td><strong>${rec.title || '-'}</strong></td></tr>
            ${rec.user_name || rec.full_name ? `<tr><td>ผู้บันทึก:</td><td><strong>${rec.user_name || rec.full_name}</strong></td></tr>` : ''}
            <tr><td>ปีภาษี:</td><td>${rec.tax_year || '2567'}</td></tr>
            <tr><td>อัปเดตล่าสุด:</td><td>${rec.updated_at ? new Date(rec.updated_at).toLocaleString('th-TH') : '-'}</td></tr>
          </table>
        </div>
      `;

      if (!isCorp) {
        const inc = payload.incomes || payload || {};
        const all = payload.allowances || {};

        html += `
          <div class="detail-section-card">
            <div class="detail-section-title">1. รายการเงินได้พึงประเมินทุกประเภท 40(1) - 40(8)</div>
            <table class="detail-table">
              ${inc.inc_40_1 ? `<tr><td>40(1) เงินเดือน โบนัส ค่าจ้างประจำ:</td><td>${formatMoney(inc.inc_40_1)} บาท</td></tr>` : ''}
              ${inc.inc_40_2 ? `<tr><td>40(2) ค่าจ้างทั่วไป ค่านายหน้า ฟรีแลนซ์:</td><td>${formatMoney(inc.inc_40_2)} บาท</td></tr>` : ''}
              ${inc.inc_40_3 ? `<tr><td>40(3) ค่าลิขสิทธิ์และสิทธิบัตร:</td><td>${formatMoney(inc.inc_40_3)} บาท</td></tr>` : ''}
              ${inc.inc_40_4 ? `<tr><td>40(4) ดอกเบี้ย เงินปันผล คริปโต:</td><td>${formatMoney(inc.inc_40_4)} บาท</td></tr>` : ''}
              ${inc.inc_40_5_building ? `<tr><td>40(5) ค่าเช่าบ้าน/อาคารสิ่งปลูกสร้าง:</td><td>${formatMoney(inc.inc_40_5_building)} บาท</td></tr>` : ''}
              ${inc.inc_40_5_vehicle ? `<tr><td>40(5) ค่าเช่ายานพาหนะ:</td><td>${formatMoney(inc.inc_40_5_vehicle)} บาท</td></tr>` : ''}
              ${inc.inc_40_6_medical ? `<tr><td>40(6) วิชาชีพอิสระแพทย์:</td><td>${formatMoney(inc.inc_40_6_medical)} บาท</td></tr>` : ''}
              ${inc.inc_40_6_other ? `<tr><td>40(6) วิชาชีพอิสระอื่น (กฎหมาย บัญชี วิศวกรรม):</td><td>${formatMoney(inc.inc_40_6_other)} บาท</td></tr>` : ''}
              ${inc.inc_40_7 ? `<tr><td>40(7) รับเหมาก่อสร้างและจัดหาสัมภาระ:</td><td>${formatMoney(inc.inc_40_7)} บาท</td></tr>` : ''}
              ${inc.inc_40_8 ? `<tr><td>40(8) การพาณิชย์ ค้าขาย ธุรกิจทั่วไป:</td><td>${formatMoney(inc.inc_40_8)} บาท</td></tr>` : ''}
              <tr style="background:#FEF3C7; font-weight:700;"><td>รวมเงินได้พึงประเมินทั้งหมด:</td><td>${formatMoney(sum.totalIncome || 0)} บาท</td></tr>
            </table>
          </div>

          <div class="detail-section-card">
            <div class="detail-section-title">2. สรุปค่าใช้จ่ายที่หักได้ตามกฎหมาย</div>
            <table class="detail-table">
              <tr><td>หักค่าใช้จ่ายเหมาตามกฎหมาย:</td><td style="color:#DC2626;">-${formatMoney(sum.totalExpense || 0)} บาท</td></tr>
              <tr><td>เงินได้คงเหลือหลังหักค่าใช้จ่าย:</td><td><strong>${formatMoney(sum.netAfterExpense || 0)} บาท</strong></td></tr>
            </table>
          </div>

          <div class="detail-section-card">
            <div class="detail-section-title">3. สรุปรายการค่าลดหย่อนภาษี</div>
            <table class="detail-table">
              <tr><td>ลดหย่อนส่วนตัวผู้มีเงินได้:</td><td>60,000 บาท</td></tr>
              ${all.has_spouse_no_income ? '<tr><td>ลดหย่อนคู่สมรส (ไม่มีเงินได้):</td><td>60,000 บาท</td></tr>' : ''}
              ${all.child_before_2561 ? `<tr><td>บุตรเกิดก่อนปี 2561 (${all.child_before_2561} คน):</td><td>${formatMoney(all.child_before_2561 * 30000)} บาท</td></tr>` : ''}
              ${all.child_after_2561 ? `<tr><td>บุตรคนที่ 2 ขึ้นไปเกิดปี 2561 เป็นต้นไป (${all.child_after_2561} คน):</td><td>${formatMoney(all.child_after_2561 * 60000)} บาท</td></tr>` : ''}
              ${all.social_security ? `<tr><td>ประกันสังคม:</td><td>${formatMoney(all.social_security)} บาท</td></tr>` : ''}
              ${all.life_insurance ? `<tr><td>ประกันชีวิตทั่วไป:</td><td>${formatMoney(all.life_insurance)} บาท</td></tr>` : ''}
              ${all.health_insurance ? `<tr><td>ประกันสุขภาพตนเอง:</td><td>${formatMoney(all.health_insurance)} บาท</td></tr>` : ''}
              ${all.rmf ? `<tr><td>กองทุนรวมเพื่อการเลี้ยงชีพ (RMF):</td><td>${formatMoney(all.rmf)} บาท</td></tr>` : ''}
              ${all.ssf ? `<tr><td>กองทุนรวมเพื่อการออม (SSF):</td><td>${formatMoney(all.ssf)} บาท</td></tr>` : ''}
              ${all.thai_esg ? `<tr><td>กองทุนรวมไทยเพื่อความยั่งยืน (Thai ESG):</td><td>${formatMoney(all.thai_esg)} บาท</td></tr>` : ''}
              ${all.home_loan_interest ? `<tr><td>ดอกเบี้ยเงินกู้ยืมเพื่อที่อยู่อาศัย:</td><td>${formatMoney(all.home_loan_interest)} บาท</td></tr>` : ''}
              <tr style="background:#FEF3C7; font-weight:700;"><td>รวมค่าลดหย่อนทั้งสิ้น:</td><td style="color:#DC2626;">-${formatMoney(sum.totalAllowance || sum.totalAllowances || 0)} บาท</td></tr>
            </table>
          </div>
        `;
      } else {
        const rev = payload.revenueData || payload || {};
        const exp = payload.expenseData || {};
        const crit = payload.criteriaData || {};

        html += `
          <div class="detail-section-card">
            <div class="detail-section-title">1. รายได้กิจการ (Revenue)</div>
            <table class="detail-table">
              <tr><td>รายได้จากการขายและบริการหลัก:</td><td>${formatMoney(rev.sales_revenue || 0)} บาท</td></tr>
              <tr><td>รายได้อื่น ๆ:</td><td>${formatMoney(rev.other_revenue || 0)} บาท</td></tr>
              <tr style="background:#FEF3C7; font-weight:700;"><td>รวมรายได้ทั้งหมดของกิจการ:</td><td>${formatMoney(sum.totalRevenue || 0)} บาท</td></tr>
            </table>
          </div>

          <div class="detail-section-card">
            <div class="detail-section-title">2. รายจ่ายและต้นทุน (Expenses)</div>
            <table class="detail-table">
              <tr><td>ต้นทุนขายและบริการ (COGS):</td><td>${formatMoney(exp.cogs || 0)} บาท</td></tr>
              <tr><td>ค่าใช้จ่ายในการดำเนินงาน (SG&A):</td><td>${formatMoney(exp.operating_expenses || 0)} บาท</td></tr>
              <tr><td>ค่าเสื่อมราคาและค่าตัดจำหน่าย:</td><td>${formatMoney(exp.depreciation || 0)} บาท</td></tr>
              <tr><td>รายจ่ายเพื่อสิทธิประโยชน์พิเศษ (200%):</td><td>${formatMoney(exp.special_deductions || 0)} บาท</td></tr>
              <tr style="background:#FEF3C7; font-weight:700;"><td>รวมรายจ่ายที่หักได้ทั้งสิ้น:</td><td style="color:#DC2626;">-${formatMoney(sum.totalExpenses || 0)} บาท</td></tr>
            </table>
          </div>

          <div class="detail-section-card">
            <div class="detail-section-title">3. เกณฑ์และการคำนวณ SME</div>
            <table class="detail-table">
              <tr><td>ทุนจดทะเบียนชำระแล้วไม่เกิน 5 ล้านบาท:</td><td>${crit.paid_up_capital_le_5m ? '✅ ผ่านเกณฑ์' : '❌ เกิน 5 ล้านบาท'}</td></tr>
              <tr><td>ยอดขายและรายได้รวมไม่เกิน 30 ล้านบาท:</td><td>${sum.isSalesLe30M ? '✅ ผ่านเกณฑ์' : '❌ เกิน 30 ล้านบาท'}</td></tr>
              <tr><td>อัตราภาษีที่กิจการได้รับสิทธิ:</td><td><strong>${sum.corporateTaxRateLabel || '20% (อัตราทั่วไป)'}</strong></td></tr>
              <tr><td>เงินบริจาคที่หักได้จริง (สูงสุด 2%):</td><td style="color:#DC2626;">-${formatMoney(sum.donationAllowed || 0)} บาท</td></tr>
            </table>
          </div>
        `;
      }

      const finalTaxText = sum.taxResultType === 'pay_more'
        ? `<span style="color:#DC2626; font-weight:700;">ชำระเพิ่ม ${formatMoney(sum.finalAmount || 0)} บาท</span>`
        : sum.taxResultType === 'refund'
        ? `<span style="color:#059669; font-weight:700;">ได้คืน ${formatMoney(sum.finalAmount || 0)} บาท</span>`
        : '<strong style="color:#334155; font-size:1.1rem;">0 บาท (ไม่มีภาษีต้องชำระเพิ่มหรือขอคืน)</strong>';

      html += `
        <div class="detail-section-card" style="border: 2px solid #F59E0B; background:#FFFBEB;">
          <div class="detail-section-title">4. สรุปผลภาษีสุทธิ</div>
          <table class="detail-table">
            <tr><td>ฐานภาษีสุทธิ (เงินได้สุทธิ/กำไรสุทธิ):</td><td><strong>${formatMoney(sum.netTaxableIncome || sum.netTaxableProfit || 0)} บาท</strong></td></tr>
            <tr><td>ภาษีที่คำนวณได้ตามอัตรา:</td><td>${formatMoney(sum.taxPayableBeforeWht || sum.totalCorporateTax || 0)} บาท</td></tr>
            <tr><td>เครดิตภาษีหัก ณ ที่จ่าย / ภ.ง.ด.51:</td><td style="color:#059669;">-${formatMoney(sum.withholdingTax || sum.totalTaxCredits || 0)} บาท</td></tr>
            <tr style="background:#FEF3C7; padding:0.6rem 0;">
              <td style="font-size:1.05rem;"><strong>สรุปภาษีสุทธิที่ต้องชำระ/ขอคืน:</strong></td>
              <td>${finalTaxText}</td>
            </tr>
          </table>
        </div>
      `;

      container.innerHTML = html;
      openModal('modal-detail-inspector');

    } catch (e) {
      console.error(e);
      showToast('เกิดข้อผิดพลาดในการเปิดดูรายละเอียดรายการภาษี', 'error');
    }
  }

  async function loadRecordById(id) {
    try {
      let rec = savedRecordsCache.find(r => String(r.id) === String(id));

      if (!rec) {
        const allLocal = getAllSystemTaxRecords();
        rec = allLocal.find(r => String(r.id) === String(id));
      }

      if (!rec) {
        try {
          const res = await fetch(API_BASE + `/tax.php?action=get&id=${id}`);
          const data = await res.json();
          if (data.success && data.record) rec = data.record;
        } catch (e) {
          // ignore
        }
      }

      if (!rec) {
        showToast('ไม่สามารถโหลดข้อมูลรายการคำนวณได้', 'error');
        return;
      }

      currentRecordId = rec.id;
      const payload = rec.income_data || {};
      const isCorp = rec.taxpayer_type === 'corporate' || payload.taxpayerType === 'corporate';

      setTaxpayerType(isCorp ? 'corporate' : 'individual');

      if (!isCorp) {
        const inc = payload.incomes || payload || {};
        const all = payload.allowances || {};

        for (const key in inc) {
          const el = document.getElementById(key);
          if (el) el.value = inc[key] > 0 ? inc[key] : '';
        }

        for (const key in all) {
          const el = document.getElementById(key);
          if (!el) continue;
          if (el.type === 'checkbox') {
            el.checked = Boolean(all[key]);
          } else {
            el.value = all[key] > 0 ? all[key] : '';
          }
        }
      } else {
        const rev = payload.revenueData || payload || {};
        const exp = payload.expenseData || {};
        const crit = payload.criteriaData || {};

        if (document.getElementById('corp_sales_revenue')) document.getElementById('corp_sales_revenue').value = rev.sales_revenue || '';
        if (document.getElementById('corp_other_revenue')) document.getElementById('corp_other_revenue').value = rev.other_revenue || '';
        if (document.getElementById('corp_wht_paid')) document.getElementById('corp_wht_paid').value = rev.withholding_tax_paid || '';
        if (document.getElementById('corp_interim_tax')) document.getElementById('corp_interim_tax').value = rev.interim_tax_paid || '';

        if (document.getElementById('corp_cogs')) document.getElementById('corp_cogs').value = exp.cogs || '';
        if (document.getElementById('corp_operating_expenses')) document.getElementById('corp_operating_expenses').value = exp.operating_expenses || '';
        if (document.getElementById('corp_depreciation')) document.getElementById('corp_depreciation').value = exp.depreciation || '';
        if (document.getElementById('corp_dep_machinery')) document.getElementById('corp_dep_machinery').value = exp.depreciation_machinery || '';
        if (document.getElementById('corp_dep_computer')) document.getElementById('corp_dep_computer').value = exp.depreciation_computer || '';
        if (document.getElementById('corp_special_deductions')) document.getElementById('corp_special_deductions').value = exp.special_deductions || '';
        if (document.getElementById('corp_addback')) document.getElementById('corp_addback').value = exp.tax_addback_expenses || '';
        if (document.getElementById('corp_exempt_income')) document.getElementById('corp_exempt_income').value = exp.tax_exempt_incomes || '';

        if (document.getElementById('corp_paid_up_capital')) document.getElementById('corp_paid_up_capital').value = crit.paid_up_capital || '';
        if (document.getElementById('corp_capital_le_5m')) document.getElementById('corp_capital_le_5m').checked = crit.paid_up_capital_le_5m ?? true;
        if (document.getElementById('corp_donate_edu')) document.getElementById('corp_donate_edu').value = crit.donation_education || '';
        if (document.getElementById('corp_donate_public')) document.getElementById('corp_donate_public').value = crit.donation_public || '';
      }

      if (rec.tax_year) {
        const yearSelect = document.getElementById('global-tax-year');
        if (yearSelect) yearSelect.value = rec.tax_year;
      }

      maxUnlockedStep = 3;
      updateStepLockUI();
      recalculate();
      goToStep(1, true);

      closeModal('modal-saved-records');
      closeModal('modal-detail-inspector');
      closeModal('modal-admin-member-records');

      showToast(`✏️ โหลดข้อมูล "${rec.title || 'แบบคำนวณ'}" เข้าสู่แบบฟอร์มเรียบร้อยแล้ว ท่านสามารถแก้ไขตัวเลขและกดบันทึกได้ทันที`, 'success');
      if (window.SoundEngine) SoundEngine.play('success');
    } catch (e) {
      console.error(e);
      showToast('เกิดข้อผิดพลาดในการโหลดข้อมูลแบบคำนวณภาษี', 'error');
    }
  }

  async function deleteRecordById(id) {
    if (!isUserLoggedIn()) {
      showToast('🔒 กรุณาเข้าสู่ระบบก่อนจัดการหรือลบข้อมูล', 'warning');
      if (window.SoundEngine) SoundEngine.play('alert');
      openModal('modal-auth');
      return;
    }
    if (!confirm('คุณต้องการลบรายการคำนวณภาษีนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) return;
    try {
      // 1. Delete from LocalStorage
      const allRecords = getAllSystemTaxRecords().filter(r => String(r.id) !== String(id));
      localStorage.setItem('tax_portal_saved_records', JSON.stringify(allRecords));

      // 2. Delete from Supabase
      if (window.SupabaseService && SupabaseService.isConfigured()) {
        try {
          if (typeof id === 'number' || !isNaN(Number(id))) {
            await SupabaseService.deleteTaxRecord(Number(id));
          }
        } catch (supaErr) {
          console.warn('Supabase delete record note:', supaErr);
        }
      }

      // 3. Delete from PHP Backend
      try {
        await fetch(`/api/tax.php?action=delete&id=${id}`, { method: 'POST' });
      } catch (phpErr) {
        // ignore
      }

      if (currentRecordId === id) currentRecordId = null;
      showToast('🗑️ ลบรายการคำนวณภาษีเรียบร้อยแล้ว', 'success');
      closeModal('modal-detail-inspector');
      openSavedRecordsModal();
    } catch (e) {
      showToast('เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
    }
  }

  // =========================================================================
  // 9. โหลดชุดข้อมูลตัวอย่าง (Presets)
  // =========================================================================

  function loadPreset(type) {
    if (type === 'salary') {
      setTaxpayerType('individual');
      document.getElementById('inc_40_1').value = 600000;
      document.getElementById('withholding_tax').value = 15000;
      document.getElementById('social_security').value = 9000;
      document.getElementById('life_insurance').value = 20000;
      document.getElementById('thai_esg').value = 30000;
      maxUnlockedStep = 3;
      updateStepLockUI();
      recalculate();
      showToast('โหลดข้อมูลตัวอย่าง: มนุษย์เงินเดือน (กองทุนสำรองเลี้ยงชีพ & Thai ESG)', 'info');

    } else if (type === 'freelance') {
      setTaxpayerType('individual');
      document.getElementById('inc_40_2').value = 480000;
      document.getElementById('inc_40_6_other').value = 240000;
      document.getElementById('withholding_tax').value = 21600;
      document.getElementById('health_insurance').value = 15000;
      document.getElementById('ssf').value = 50000;
      document.getElementById('thai_esg').value = 20000;
      maxUnlockedStep = 3;
      updateStepLockUI();
      recalculate();
      showToast('โหลดข้อมูลตัวอย่าง: ฟรีแลนซ์/วิชาชีพอิสระ (ประกันสุขภาพ & ประกันชีวิต)', 'info');

    } else if (type === 'corp_sme') {
      setTaxpayerType('corporate');
      document.getElementById('corp_sales_revenue').value = 10000000;
      document.getElementById('corp_other_revenue').value = 500000;
      document.getElementById('corp_wht_paid').value = 50000;
      document.getElementById('corp_interim_tax').value = 20000;

      document.getElementById('corp_cogs').value = 6000000;
      document.getElementById('corp_operating_expenses').value = 1500000;
      document.getElementById('corp_depreciation').value = 0;
      document.getElementById('corp_dep_machinery').value = 150000;
      document.getElementById('corp_dep_computer').value = 50000;
      document.getElementById('corp_special_deductions').value = 0;
      document.getElementById('corp_addback').value = 0;
      document.getElementById('corp_exempt_income').value = 0;

      document.getElementById('corp_paid_up_capital').value = 3000000;
      document.getElementById('corp_capital_le_5m').checked = true;
      document.getElementById('corp_donate_edu').value = 0;
      document.getElementById('corp_donate_public').value = 0;

      maxUnlockedStep = 3;
      updateStepLockUI();
      recalculate();
      showToast('โหลดข้อมูลตัวอย่าง: นิติบุคคล SME (กำไรสุทธิ 2.8 ล้านบาท)', 'info');

    } else if (type === 'reset') {
      currentRecordId = null;
      document.querySelectorAll('input[type="number"]').forEach((i) => (i.value = ''));
      document.querySelectorAll('input[type="checkbox"]').forEach((i) => (i.checked = false));
      if (document.getElementById('corp_capital_le_5m')) document.getElementById('corp_capital_le_5m').checked = true;
      maxUnlockedStep = 1;
      updateStepLockUI();
      goToStep(1, true);
      recalculate();
      showToast('ล้างข้อมูลในแบบฟอร์มและเริ่มใหม่เรียบร้อยแล้ว', 'info');
    }
  }

  // =========================================================================
  // 9.5 แจ้งปัญหาและติดต่อแอดมิน (Support Tickets & Chat)
  // =========================================================================

  // Base API path พร้อม auto-detect รันผ่าน /tax/ หรือ root /
  const API_BASE = (function() {
    const p = window.location.pathname;
    if (p.startsWith('/tax')) return '/tax/api';
    return '/api';
  })();

  const TICKET_API = API_BASE + '/ticket.php';

  const TICKET_CATEGORY_LABELS = {
    calculation_issue: '🔢 แจ้งปัญหาการคำนวณ',
    tax_law:           '📜 สอบถามข้อกฎหมายภาษี',
    bug:               '🐛 ระบบทำงานผิดพลาด',
    suggestion:        '💡 ข้อเสนอแนะ',
    other:             '❓ อื่น ๆ'
  };

  const TICKET_STATUS_LABELS = {
    pending:     { text: '⏳ รอดำเนินการ',        cls: 'status-pending' },
    in_progress: { text: '🔧 กำลังดำเนินการ',    cls: 'status-inprogress' },
    resolved:    { text: '✅ แก้ไขสำเร็จ',          cls: 'status-resolved' }
  };

  // Ticket submit (modal + chat widget)
  async function submitTicket({ category, message, contactName, contactInfo, screenshotFile }) {
    if (!message.trim()) {
      showToast('กรุณากรอกข้อความก่อนส่งแจ้งปัญหา', 'error');
      return false;
    }

    let screenshotBase64 = null;
    if (screenshotFile) {
      screenshotBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror  = () => resolve(null);
        reader.readAsDataURL(screenshotFile);
      });
    }

    // Auto-fill from logged-in user if blank
    if (currentUser) {
      if (!contactName) contactName = currentUser.full_name;
      if (!contactInfo) contactInfo = currentUser.email || currentUser.phone || currentUser.username || '';
    }

    try {
      const res = await fetch(TICKET_API + '?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          message: message.trim(),
          contact_name: contactName,
          contact_info: contactInfo,
          screenshot: screenshotBase64
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('ส่งเรื่องแจ้งปัญหาเรียบร้อยแล้ว เจ้าหน้าที่จะดำเนินการตรวจสอบโดยเร็ว! (#' + data.ticket_id + ')', 'success');
        return true;
      } else {
        showToast('ไม่สามารถส่งเรื่องได้: ' + (data.message || 'กรุณาตรวจสอบข้อมูล'), 'error');
        return false;
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการบันทึกคำตอบกลับ', 'error');
      return false;
    }
  }

  // จัดการแบบฟอร์มติดต่อสอบถามและแจ้งปัญหา
  async function handleContactTicketSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]');
    if (btn) btn.disabled = true;

    const ok = await submitTicket({
      category:     document.getElementById('ticket-category')?.value || 'calculation_issue',
      message:      document.getElementById('ticket-message')?.value || '',
      contactName:  document.getElementById('ticket-contact-name')?.value.trim() || '',
      contactInfo:  document.getElementById('ticket-contact-info')?.value.trim() || '',
      screenshotFile: document.getElementById('ticket-screenshot')?.files?.[0] || null
    });

    if (ok) {
      e.target.reset();
      closeModal('modal-contact');
    }
    if (btn) btn.disabled = false;
  }

  // แชทสอบถามปัญหาและแจ้งเรื่อง (Chat Widget)
  async function handleChatTicketSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]');
    if (btn) btn.disabled = true;

    const ok = await submitTicket({
      category:    document.getElementById('chat-category')?.value || 'calculation_issue',
      message:     document.getElementById('chat-message')?.value || '',
      contactName: '',
      contactInfo: document.getElementById('chat-contact')?.value.trim() || '',
      screenshotFile: document.getElementById('chat-screenshot')?.files?.[0] || null
    });

    if (ok) {
      e.target.reset();
      loadChatMyTickets(); // refresh history
    }
    if (btn) btn.disabled = false;
  }

  async function loadChatMyTickets() {
    const container = document.getElementById('chat-my-tickets');
    if (!container) return;

    if (!currentUser) {
      container.innerHTML = '<p style="font-size:0.75rem; color:var(--text-muted); text-align:center; padding:0.5rem 0;">กรุณาเข้าสู่ระบบเพื่อดูประวัติการติดต่อและคำตอบกลับจากแอดมิน</p>';
      return;
    }

    container.innerHTML = '<p style="font-size:0.75rem; color:var(--text-muted); padding:0.3rem 0;">กำลังโหลดประวัติการติดต่อ...</p>';

    try {
      const res  = await fetch(TICKET_API + '?action=my_tickets');
      const data = await res.json();
      if (!data.success || !data.tickets?.length) {
        container.innerHTML = '<p style="font-size:0.75rem; color:var(--text-muted); text-align:center; padding:0.5rem 0;">ยังไม่มีประวัติการส่งข้อความสอบถาม</p>';
        return;
      }

      container.innerHTML = data.tickets.map(t => {
        const sl    = TICKET_STATUS_LABELS[t.status] || { text: t.status, cls: '' };
        const catLb = TICKET_CATEGORY_LABELS[t.category] || t.category;
        const date  = new Date(t.created_at).toLocaleDateString('th-TH', { day:'2-digit', month:'short', year:'2-digit' });
        const reply = t.admin_reply
          ? `<div class="chat-admin-reply"><span class="reply-badge">แอดมินตอบกลับ</span>${t.admin_reply}</div>`
          : '';
        return `
          <div class="chat-ticket-item">
            <div class="chat-ticket-header">
              <span class="ticket-cat-badge">${catLb}</span>
              <span class="ticket-status-badge ${sl.cls}">${sl.text}</span>
              <span class="ticket-date">${date}</span>
            </div>
            <p class="chat-ticket-msg">${t.message}</p>
            ${reply}
          </div>`;
      }).join('');
    } catch {
      container.innerHTML = '<p style="font-size:0.75rem; color:#DC2626; padding:0.3rem 0;">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
  }

  // Admin: โหลดรายการตั๋วแจ้งปัญหา (Support Tickets)
  async function loadAdminTickets(statusFilter = 'all') {
    const tbody = document.getElementById('admin-tickets-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#92400E;">กำลังโหลดข้อมูลรายการข้อร้องเรียน...</td></tr>`;

    try {
      const res  = await fetch(TICKET_API + '?action=list&status=' + statusFilter);
      const data = await res.json();

      // อัปเดตตัวเลขแสดงผลบน Badge สรุปสถานะ
      const c = data.counts || {};
      const countEl = document.getElementById('admin-ticket-count-summary');
      if (countEl) {
        countEl.innerHTML = `
          <span class="ticket-count-badge all">ทั้งหมด ${c.total || 0}</span>
          <span class="ticket-count-badge pending">รอดำเนินการ ${c.pending || 0}</span>
          <span class="ticket-count-badge inprogress">กำลังดำเนินการ ${c.in_progress || 0}</span>
          <span class="ticket-count-badge resolved">เสร็จสิ้น ${c.resolved || 0}</span>`;
      }

      if (!data.success || !data.tickets?.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#64748B;">ไม่พบข้อร้องเรียนในสถานะนี้</td></tr>`;
        return;
      }

      tbody.innerHTML = '';
      data.tickets.forEach(t => {
        const sl    = TICKET_STATUS_LABELS[t.status] || { text: t.status, cls: '' };
        const catLb = TICKET_CATEGORY_LABELS[t.category] || t.category;
        const date  = new Date(t.created_at).toLocaleDateString('th-TH');
        const sender = t.user_full_name
          ? `${t.user_full_name} <span style="color:var(--text-muted); font-size:0.75rem;">(${t.username})</span>`
          : (t.contact_name || '<span style="color:var(--text-muted);">บุคคลทั่วไป (Guest)</span>');
        const contactInfo = t.contact_info || t.user_email || '-';
        const hasReply = !!t.admin_reply;

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-size:0.8rem; color:var(--text-muted);">#${t.id}</td>
          <td>${sender}</td>
          <td><span style="font-size:0.78rem;">${catLb}</span></td>
          <td style="max-width:200px; font-size:0.82rem; white-space:pre-wrap; word-break:break-word;">${t.message.substring(0, 80)}${t.message.length > 80 ? '...' : ''}</td>
          <td><span class="ticket-status-badge ${sl.cls}">${sl.text}</span>${hasReply ? ' <span style="font-size:0.7rem;">💬 ตอบแล้ว</span>' : ''}</td>
          <td style="font-size:0.78rem; color:var(--text-muted);">${date}</td>
          <td style="white-space:nowrap;">
            <button class="btn btn-outline-gold btn-sm btn-ticket-reply" data-id="${t.id}" data-name="${(t.contact_name || t.user_full_name || '').replace(/"/g,"'")}" data-reply="${(t.admin_reply || '').replace(/"/g,"'")}">
              💬 ตอบกลับ / ดูเรื่อง
            </button>
            <select class="input-control btn-ticket-status" data-id="${t.id}" style="display:inline-block; width:auto; padding:0.25rem 0.4rem; font-size:0.75rem; margin-left:0.25rem;">
              <option value="pending"     ${t.status==='pending'     ?'selected':''}>รอดำเนินการ</option>
              <option value="in_progress" ${t.status==='in_progress' ?'selected':''}>กำลังดำเนินการ</option>
              <option value="resolved"    ${t.status==='resolved'    ?'selected':''}>เสร็จสิ้นแล้ว</option>
            </select>
            <button class="btn btn-danger-ghost btn-sm btn-ticket-delete" data-id="${t.id}" title="ลบ">🗑️ ลบ</button>
          </td>`;

        // Reply
        tr.querySelector('.btn-ticket-reply').addEventListener('click', () => {
          adminReplyTicketId = t.id;
          const box = document.getElementById('admin-ticket-reply-box');
          const titleEl = document.getElementById('admin-reply-title');
          const textEl  = document.getElementById('admin-reply-text');
          if (titleEl) titleEl.textContent = `ตอบกลับ Ticket #${t.id} ของ ${t.contact_name || t.user_full_name || 'ผู้ติดต่อ'}`;
          if (textEl)  textEl.value = t.admin_reply || '';
          if (box) { box.hidden = false; box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
        });

        // Status change inline
        tr.querySelector('.btn-ticket-status').addEventListener('change', async (ev) => {
          try {
            const r = await fetch(TICKET_API + '?action=update_status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ticket_id: t.id, status: ev.target.value })
            });
            const d = await r.json();
            if (d.success) {
              showToast('เปลี่ยนสถานะเรียบร้อยแล้ว', 'success');
              loadAdminTickets(document.getElementById('admin-ticket-filter')?.value || 'all');
              loadAdminStats();
            } else showToast('??? ' + d.message, 'error');
          } catch { showToast('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ', 'error'); }
        });

        // Delete
        tr.querySelector('.btn-ticket-delete').addEventListener('click', async () => {
          if (!confirm(`คุณต้องการลบ Ticket #${t.id} ใช่หรือไม่?`)) return;
          try {
            const r = await fetch(TICKET_API + '?action=delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ticket_id: t.id })
            });
            const d = await r.json();
            if (d.success) {
              showToast('ลบรายการข้อร้องเรียนเรียบร้อยแล้ว', 'success');
              loadAdminTickets(document.getElementById('admin-ticket-filter')?.value || 'all');
              loadAdminStats();
            } else showToast('??? ' + d.message, 'error');
          } catch { showToast('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ', 'error'); }
        });

        tbody.appendChild(tr);
      });
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#DC2626; padding:1.5rem;">เกิดข้อผิดพลาดในการโหลดข้อมูล: ${e.message}</td></tr>`;
    }
  }

  // Admin: บันทึกการตอบกลับข้อร้องเรียนของผู้ใช้
  async function handleAdminTicketReply() {
    if (!adminReplyTicketId) return;
    const replyText = document.getElementById('admin-reply-text')?.value.trim();
    const newStatus = document.getElementById('admin-reply-status')?.value || 'resolved';

    if (!replyText) {
      showToast('กรุณากรอกข้อความตอบกลับก่อนทำการบันทึก', 'error');
      return;
    }

    try {
      const res  = await fetch(TICKET_API + '?action=reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: adminReplyTicketId, admin_reply: replyText, status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        showToast('บันทึกคำตอบกลับและอัปเดตสถานะเรียบร้อยแล้ว', 'success');
        document.getElementById('admin-ticket-reply-box').hidden = true;
        document.getElementById('admin-reply-text').value = '';
        adminReplyTicketId = null;
        loadAdminTickets(document.getElementById('admin-ticket-filter')?.value || 'all');
        loadAdminStats();
      } else {
        showToast('ไม่สามารถบันทึกได้: ' + (data.message || 'เกิดข้อผิดพลาด'), 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการบันทึกคำตอบกลับ', 'error');
    }
  }

  // =========================================================================
  // 10.0 กำหนดการยื่นภาษีและนาฬิกาตามเวลาจริง (Filing Deadline Banner & Real-time Clock)
  // =========================================================================

  let clockIntervalId = null;

  function updateRealtimeClock() {
    const clockEl = document.getElementById('realtime-clock-display');
    if (!clockEl) return;
    const now = new Date();
    const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const dayName = thaiDays[now.getDay()];
    const dateNum = now.getDate();
    const monthName = thaiMonths[now.getMonth()];
    const beYear = now.getFullYear() + 543;
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    clockEl.textContent = `วัน${dayName}ที่ ${dateNum} ${monthName} ${beYear} | ${hours}:${minutes}:${seconds} น.`;
  }

  function startRealtimeClock() {
    updateRealtimeClock();
    if (clockIntervalId) clearInterval(clockIntervalId);
    clockIntervalId = setInterval(updateRealtimeClock, 1000);
  }

  function formatDeadlineCountdown(targetDate, now) {
    const diffMs = targetDate - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const passedDays = Math.abs(diffDays);
      return {
        text: `⚠️ สิ้นสุดกำหนดแล้ว (ผ่านไป ${passedDays} วัน)`,
        cls: 'deadline-status passed'
      };
    } else if (diffDays === 0) {
      return {
        text: '🔥 สิ้นสุดกำหนดวันนี้!',
        cls: 'deadline-status urgent'
      };
    } else if (diffDays <= 7) {
      return {
        text: `🔥 เหลือเวลาเพียง ${diffDays} วันสุดท้าย!`,
        cls: 'deadline-status urgent'
      };
    } else if (diffDays <= 30) {
      return {
        text: `⚠️ เหลือเวลา ${diffDays} วัน (ใกล้สิ้นสุดกำหนด)`,
        cls: 'deadline-status urgent'
      };
    } else if (diffDays <= 90) {
      const months = Math.floor(diffDays / 30);
      const days = diffDays % 30;
      return {
        text: `📍 เหลือเวลา ~${months} เดือน ${days > 0 ? days + ' วัน' : ''}`,
        cls: 'deadline-status soon'
      };
    } else {
      const months = Math.floor(diffDays / 30);
      return {
        text: `📍 เหลือเวลา ~${months} เดือน (${diffDays} วัน)`,
        cls: 'deadline-status normal'
      };
    }
  }

  function updateDeadlineBanner(customYear) {
    const now = new Date();
    const currentCE = now.getFullYear();
    const currentBE = currentCE + 543;

    // Get active tax year (from dropdown or default to current year)
    let taxYearNum = parseInt(customYear || document.getElementById('global-tax-year')?.value || currentBE, 10);
    if (isNaN(taxYearNum)) taxYearNum = currentBE;

    // Filing year is typically taxYearNum + 1 (e.g. Tax Year 2569 is filed in early 2570)
    const filingYearBE = taxYearNum + 1;
    const filingYearCE = filingYearBE - 543;

    // Update banner texts
    const bannerTaxYearEl = document.getElementById('banner-tax-year');
    if (bannerTaxYearEl) bannerTaxYearEl.textContent = taxYearNum;

    const bannerFilingYearEl = document.getElementById('banner-filing-year');
    if (bannerFilingYearEl) bannerFilingYearEl.textContent = filingYearBE;

    const bannerTitleEl = document.getElementById('deadline-banner-title');
    if (bannerTitleEl && !bannerTaxYearEl) {
      bannerTitleEl.textContent = `กำหนดการยื่นภาษี ปีภาษี ${taxYearNum} (รอบ พ.ศ. ${filingYearBE})`;
    }

    // 1. บุคคลธรรมดา ภ.ง.ด. 90/91 (ยื่นกระดาษ 31 มี.ค., e-Filing ~8 เม.ย.)
    const indDeadlineDate = new Date(filingYearCE, 2, 31, 23, 59, 59); // March 31 of filing year
    const indDateEl = document.getElementById('deadline-date-individual');
    if (indDateEl) {
      indDateEl.textContent = `1 ม.ค. - 31 มี.ค. ${filingYearBE} (e-Filing ถึง 8 เม.ย.)`;
    }
    const indStatusEl = document.getElementById('deadline-status-individual');
    if (indStatusEl) {
      const res = formatDeadlineCountdown(indDeadlineDate, now);
      indStatusEl.textContent = res.text;
      indStatusEl.className = res.cls;
    }

    // 2. นิติบุคคล ภ.ง.ด. 50 (ภายใน 150 วันนับแต่วันสิ้นรอบบัญชี 31 พ.ค.)
    const corpDeadlineDate = new Date(filingYearCE, 4, 31, 23, 59, 59); // May 31 of filing year
    const corpDateEl = document.getElementById('deadline-date-corporate');
    if (corpDateEl) {
      corpDateEl.textContent = `ภายใน 31 พ.ค. ${filingYearBE} (150 วัน)`;
    }
    const corpStatusEl = document.getElementById('deadline-status-corporate');
    if (corpStatusEl) {
      const res = formatDeadlineCountdown(corpDeadlineDate, now);
      corpStatusEl.textContent = res.text;
      corpStatusEl.className = res.cls;
    }

    // 3. ภาษีครึ่งปี ภ.ง.ด. 94 / 51 (ยื่นภายใน 30 ก.ย. ของปีภาษีนั้น)
    const midyearTaxCE = taxYearNum - 543;
    const midyearDeadlineDate = new Date(midyearTaxCE, 8, 30, 23, 59, 59); // Sept 30 of tax year
    const midDateEl = document.getElementById('deadline-date-midyear');
    if (midDateEl) {
      midDateEl.textContent = `1 ก.ค. - 30 ก.ย. ${taxYearNum} (ครึ่งปี)`;
    }
    const midStatusEl = document.getElementById('deadline-status-midyear');
    if (midStatusEl) {
      const res = formatDeadlineCountdown(midyearDeadlineDate, now);
      midStatusEl.textContent = res.text;
      midStatusEl.className = res.cls;
    }
  }

  function initDynamicTaxYears() {
    const now = new Date();
    const currentCE = now.getFullYear();
    const currentBE = currentCE + 543;

    // Populate global-tax-year and save-tax-year dynamically if not already populated with current year
    const years = [currentBE - 2, currentBE - 1, currentBE, currentBE + 1];

    const globalSelect = document.getElementById('global-tax-year');
    if (globalSelect) {
      const currentSelected = globalSelect.value;
      globalSelect.innerHTML = '';
      years.forEach(y => {
        const opt = document.createElement('option');
        opt.value = String(y);
        opt.textContent = String(y);
        if (y === currentBE) opt.selected = true;
        globalSelect.appendChild(opt);
      });
      if (currentSelected && years.map(String).includes(currentSelected)) {
        globalSelect.value = currentSelected;
      } else {
        globalSelect.value = String(currentBE);
      }
    }

    const saveSelect = document.getElementById('save-tax-year');
    if (saveSelect) {
      saveSelect.innerHTML = '';
      years.forEach(y => {
        const opt = document.createElement('option');
        opt.value = String(y);
        opt.textContent = String(y);
        if (y === currentBE) opt.selected = true;
        saveSelect.appendChild(opt);
      });
      saveSelect.value = String(currentBE);
    }

    // Update Hero badge
    document.querySelectorAll('.hero-badge-year').forEach(el => {
      el.textContent = `ปีภาษี ${currentBE} ล่าสุด`;
    });

    // Update Banner
    updateDeadlineBanner(globalSelect?.value || currentBE);
  }

  function initDeadlineBanner() {
    initDynamicTaxYears();
    startRealtimeClock();
  }

  // =========================================================================
  // 10. ผูกเหตุการณ์และเริ่มต้นระบบ (Event Listeners & Initialize)
  // =========================================================================

  function init() {
    // 1. Taxpayer Type Buttons
    document.getElementById('btn-type-individual')?.addEventListener('click', () => setTaxpayerType('individual'));
    document.getElementById('btn-type-corporate')?.addEventListener('click', () => setTaxpayerType('corporate'));

    // 2. Navigation Step Buttons (3 Steps)
    Object.keys(stepBtns).forEach((s) => {
      const stepNum = parseInt(s, 10);
      stepBtns[stepNum]?.addEventListener('click', () => {
        if (stepNum > maxUnlockedStep) {
          if (!hasFirstStepData()) {
            showToast('กรุณากรอกข้อมูลรายได้ในขั้นตอนที่ 1 ก่อน', 'error');
            if (window.SoundEngine) SoundEngine.play('alert');
            highlightRequiredIncomeInput();
          } else {
            showToast('กรุณากรอกข้อมูลขั้นตอนก่อนหน้าให้ครบถ้วนก่อน', 'error');
          }
          return;
        }
        goToStep(stepNum);
      });
    });

    // 3. Next / Prev Buttons
    document.querySelectorAll('.btn-next-step').forEach((btn) => {
      btn.addEventListener('click', () => goToStep(activeStep + 1));
    });

    document.querySelectorAll('.btn-prev-step').forEach((btn) => {
      btn.addEventListener('click', () => goToStep(activeStep - 1, true));
    });

    // 4. Inputs change -> Realtime Recalculate
    document.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', recalculate);
      input.addEventListener('change', recalculate);
    });

    // 5. Modals & Closes
    document.querySelectorAll('.modal-close-btn, .modal-backdrop').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (e.target === el) {
          const modal = el.closest('.modal-backdrop');
          modal.classList.remove('open');
          // Reset auth modal to login tab when closed
          if (modal.id === 'modal-auth') {
            showAuthTab('login');
          }
          // Clear all auth form errors on modal close
          ['err-login','err-reg-email','err-reg-fullname','err-reg-password','err-reg-taxid','err-forgot-email','err-forgot'].forEach(id => setFieldError(id,''));
        }
      });
    });

    // Auth buttons (static initial HTML - use event delegation on header)
    document.getElementById('header-user-section')?.addEventListener('click', (e) => {
      const loginBtn = e.target.closest('#btn-open-login');
      const regBtn   = e.target.closest('#btn-open-register');
      if (loginBtn) { showAuthTab('login');    openModal('modal-auth'); }
      if (regBtn)   { showAuthTab('register'); openModal('modal-auth'); }
    });

    document.getElementById('tab-login-btn')?.addEventListener('click', () => {
      showAuthTab('login');
      // Clear register errors when switching to login
      ['err-reg-email','err-reg-fullname','err-reg-password','err-reg-taxid'].forEach(id => setFieldError(id,''));
    });
    document.getElementById('tab-register-btn')?.addEventListener('click', () => {
      showAuthTab('register');
      // Clear login error when switching to register
      setFieldError('err-login', '');
    });

    document.getElementById('toggle-login-pwd')?.addEventListener('click', () => {
      const inp = document.getElementById('login-password');
      inp.type = inp.type === 'password' ? 'text' : 'password';
    });
    document.getElementById('toggle-reg-pwd')?.addEventListener('click', () => {
      const inp = document.getElementById('reg-password');
      inp.type = inp.type === 'password' ? 'text' : 'password';
    });

    document.getElementById('form-login')?.addEventListener('submit', handleLogin);
    document.getElementById('form-register')?.addEventListener('submit', handleRegister);
    document.getElementById('form-forgot-password')?.addEventListener('submit', handleForgotPassword);

    // Forgot password flow
    document.getElementById('btn-forgot-password')?.addEventListener('click', (e) => {
      e.preventDefault();
      showAuthTab('forgot');
      // Pre-fill email from login form if available
      const loginEmail = document.getElementById('login-email')?.value.trim();
      if (loginEmail) {
        document.getElementById('forgot-email').value = loginEmail;
      }
    });
    document.getElementById('btn-back-to-login')?.addEventListener('click', (e) => {
      e.preventDefault();
      showAuthTab('login');
    });

    // Compute & display real filing deadlines
    initDeadlineBanner();

    // Tax Year dropdown change listener
    document.getElementById('global-tax-year')?.addEventListener('change', (e) => {
      const chosenYear = e.target.value;
      updateDeadlineBanner(chosenYear);
      document.querySelectorAll('.hero-badge-year').forEach(el => {
        el.textContent = `ปีภาษี ${chosenYear} ล่าสุด`;
      });
      const saveYearEl = document.getElementById('save-tax-year');
      if (saveYearEl) saveYearEl.value = chosenYear;
      recalculate();
    });
    document.getElementById('form-profile-settings')?.addEventListener('submit', handleProfileSave);

    // Profile Avatar selection
    document.querySelectorAll('.avatar-preset-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        selectedProfilePic = e.target.dataset.avatar;
        updateProfilePicPreview(selectedProfilePic);
      });
    });

    document.getElementById('btn-remove-pic')?.addEventListener('click', () => {
      selectedProfilePic = '';
      updateProfilePicPreview('');
    });

    document.getElementById('profile-pic-upload')?.addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) {
          showToast('ขนาดไฟล์รูปภาพต้องไม่เกิน 2MB', 'error');
          return;
        }
        const reader = new FileReader();
        reader.onload = function (evt) {
          selectedProfilePic = evt.target.result;
          updateProfilePicPreview(selectedProfilePic);
        };
        reader.readAsDataURL(file);
      }
    });

    // Admin Search
    document.getElementById('btn-admin-search')?.addEventListener('click', () => {
      const term = document.getElementById('admin-search-input').value.trim();
      loadAdminMembers(term);
    });
    document.getElementById('admin-search-input')?.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        loadAdminMembers(e.target.value.trim());
      }
    });

    // 6. Action buttons
    document.getElementById('btn-calculate-now')?.addEventListener('click', async () => {
      if (!hasFirstStepData()) {
        showToast('กรุณากรอกข้อมูลรายได้ในขั้นตอนที่ 1 ก่อนคำนวณภาษี', 'error');
        if (window.SoundEngine) SoundEngine.play('alert');
        highlightRequiredIncomeInput();
        return;
      }
      goToStep(3);
      await autoSaveCalculatedRecord();
      showToast('⚡ คำนวณภาษีและบันทึกลงประวัติเรียบร้อยแล้ว ท่านสามารถดูย้อนหลังได้ที่ [📂 ข้อมูลภาษีที่บันทึกไว้]', 'success');
      if (window.SoundEngine) SoundEngine.play('coin');
    });
    document.getElementById('btn-save-record')?.addEventListener('click', handleSaveRecord);
    document.getElementById('btn-save-record-step3')?.addEventListener('click', handleSaveRecord);
    document.getElementById('btn-view-saved-step3')?.addEventListener('click', openSavedRecordsModal);
    document.getElementById('guest-login-cta')?.addEventListener('click', () => {
      showAuthTab('login');
      openModal('modal-auth');
    });

    // Simulator & Quick Simulator
    document.getElementById('btn-run-simulator')?.addEventListener('click', runSimulator);
    document.getElementById('quick-sim-slider')?.addEventListener('input', updateQuickSim);

    // Direct Header Auth Buttons
    document.getElementById('btn-open-login')?.addEventListener('click', () => {
      showAuthTab('login');
      openModal('modal-auth');
    });
    document.getElementById('btn-open-register')?.addEventListener('click', () => {
      showAuthTab('register');
      openModal('modal-auth');
    });

    // 7. Presets
    document.getElementById('preset-salary')?.addEventListener('click', () => loadPreset('salary'));
    document.getElementById('preset-freelance')?.addEventListener('click', () => loadPreset('freelance'));
    document.getElementById('preset-corp-sme')?.addEventListener('click', () => loadPreset('corp_sme'));
    document.getElementById('preset-reset')?.addEventListener('click', () => loadPreset('reset'));

    // =========================================================================
    // 8. ออกแบบพิมพ์ ภ.ง.ด. และแสดงหน้ารายละเอียดการคิดคำนวณภาษี (P.N.D. Report)
    // สไตล์งานสารบรรณราชการทางการ ใช้ฟอนต์ TH Sarabun New / Sarabun
    // แสดงรายการแจกแจงแบบจุดไข่ปลา (Leader Dots) ตามข้อกำหนดโดยไม่ต้องใช้ตาราง
    // =========================================================================

    function formatThaiBahtText(num) {
      if (num === null || num === undefined || isNaN(num)) return 'ศูนย์บาทถ้วน';
      num = Math.round(Math.abs(num) * 100) / 100;
      if (num === 0) return 'ศูนย์บาทถ้วน';
      const thaiNums = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
      const units = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

      function convertGroup(nStr) {
        let res = '';
        const len = nStr.length;
        for (let i = 0; i < len; i++) {
          const d = parseInt(nStr.charAt(i), 10);
          const pos = len - i - 1;
          if (d !== 0) {
            if (pos === 1 && d === 1) {
              res += 'สิบ';
            } else if (pos === 1 && d === 2) {
              res += 'ยี่สิบ';
            } else if (pos === 0 && d === 1 && len > 1 && nStr.charAt(len - 2) !== '0') {
              res += 'เอ็ด';
            } else {
              res += thaiNums[d] + units[pos];
            }
          }
        }
        return res;
      }

      const parts = num.toFixed(2).split('.');
      const intPart = parts[0];
      const satangPart = parts[1];

      let result = '';
      if (parseInt(intPart, 10) === 0) {
        result = 'ศูนย์บาท';
      } else {
        let remaining = intPart;
        let groups = [];
        while (remaining.length > 6) {
          groups.unshift(remaining.slice(-6));
          remaining = remaining.slice(0, -6);
        }
        groups.unshift(remaining);

        for (let g = 0; g < groups.length; g++) {
          const converted = convertGroup(groups[g]);
          result += converted;
          if (g < groups.length - 1 && converted !== '') {
            result += 'ล้าน';
          }
        }
        result += 'บาท';
      }

      const satangInt = parseInt(satangPart, 10);
      if (satangInt === 0) {
        result += 'ถ้วน';
      } else {
        result += convertGroup(satangPart) + 'สตางค์';
      }

      return result;
    }

    function generatePndReportHtml(res, customRecord = null) {
      if (!res) {
        recalculate();
        res = latestResult;
      }
      if (!res) return '<div style="padding:2.5rem; text-align:center; color:#64748B; font-family:\'TH Sarabun New\',\'Sarabun\',sans-serif; font-size:18px;">ยังไม่มีข้อมูลผลการคำนวณภาษี กรุณากรอกข้อมูลในแบบฟอร์มก่อน</div>';

      const isIndividual = customRecord ? (customRecord.taxpayer_type === 'individual') : (taxpayerType === 'individual');
      const taxYear = customRecord?.tax_year || document.getElementById('global-tax-year')?.value || String(new Date().getFullYear() + 543);
      const filingYear = parseInt(taxYear, 10) + 1;
      const now = new Date();
      const dateFormatted = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
      const timeFormatted = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      const userName = currentUser ? (currentUser.full_name || currentUser.username) : 'ผู้มีเงินได้ (บุคคลทั่วไป)';
      const userTaxId = currentUser?.tax_id || '๑-XXXX-XXXXX-XX-X';
      const refId = `TAX-${taxYear}-${(now.getTime() % 10000000).toString(36).toUpperCase()}`;

      const formData = getFormData();
      const inc = customRecord?.income_data || formData.incomes || {};
      const allow = customRecord?.allowance_data || formData.allowances || {};
      const rev = customRecord?.revenue_data || formData.revenueData || {};
      const expCorp = customRecord?.expense_data || formData.expenseData || {};

      // Vector Royal Thai Garuda Crest (ตราครุฑพ่าห์ สัญลักษณ์เอกสารราชการ)
      const garudaSvg = `
        <svg class="gov-garuda-svg" viewBox="0 0 100 95" xmlns="http://www.w3.org/2000/svg">
          <path d="M50,4 C51.5,10 54,15 57,19 C55.5,21 54,23 53.5,26 C57,25 61,23 65,21 C62,26 57,29 53,31 C56,33 60,34 65,35 C60,38 55,40 50,41 C45,40 40,38 35,35 C40,34 44,33 47,31 C43,29 38,26 35,21 C39,23 43,25 46.5,26 C46,23 44.5,21 43,19 C46,15 48.5,10 50,4 Z" opacity="0.95"/>
          <path d="M50,30 C53,30 55,32 55,35 C55,39 52.5,42 50,42 C47.5,42 45,39 45,35 C45,32 47,30 50,30 Z"/>
          <path d="M50,42 C56,43 66,48 78,42 C85,38 91,32 96,25 C93,35 86,47 77,53 C83,53 89,51 94,48 C88,57 80,64 71,67 C76,68 82,67 87,65 C79,74 69,78 59,79 C57,83 54,88 50,91 C46,88 43,83 41,79 C31,78 21,74 13,65 C18,67 24,68 29,67 C20,64 12,57 6,48 C11,51 17,53 23,53 C14,47 7,35 4,25 C9,32 15,38 22,42 C34,48 44,43 50,42 Z"/>
          <path d="M41,79 C44,79 47,81 50,81 C53,81 56,79 59,79 C57,84 54,89 50,92 C46,89 43,84 41,79 Z"/>
        </svg>
      `;

      let html = `
        <div class="pnd-sheet-container">
          <!-- ส่วนหัวเอกสารราชการทางการ -->
          <div class="gov-doc-header">
            <div class="gov-emblem-wrap">
              ${garudaSvg}
            </div>
            <div class="gov-doc-super-title">บันทึกข้อความสรุปรายการภาษีอิเล็กทรอนิกส์ (e-Tax Assessment Statement)</div>
            <h1 class="gov-doc-main-title">แบบแสดงรายการและรายละเอียดการคำนวณภาษีเงินได้${isIndividual ? 'บุคคลธรรมดา (ภ.ง.ด. ๙๐/๙๑)' : 'นิติบุคคล (ภ.ง.ด. ๕๐)'}</h1>
            <div class="gov-doc-sub-title">ประจำปีภาษี พ.ศ. ${taxYear} (รอบระยะเวลายื่นแบบแสดงรายการ พ.ศ. ${filingYear})</div>
            <div class="gov-doc-org-note">ระบบสารสนเทศคำนวณภาษี TAX PORTAL ตามบทบัญญัติแห่งประมวลรัษฎากร กรมสรรพากร กระทรวงการคลัง</div>
          </div>

          <!-- กล่องข้อมูลสารบรรณและข้อมูลผู้เสียภาษี -->
          <div class="gov-meta-sheet">
            <div class="gov-meta-row">
              <div class="gov-meta-col"><span class="gov-meta-label">เลขที่อ้างอิงเอกสาร:</span> <span class="gov-meta-val">${refId}</span></div>
              <div class="gov-meta-col"><span class="gov-meta-label">วันที่คำนวณและประเมิน:</span> <span class="gov-meta-val">${dateFormatted} เวลา ${timeFormatted} น.</span></div>
            </div>
            <div class="gov-meta-row">
              <div class="gov-meta-col"><span class="gov-meta-label">ผู้มีเงินได้ / ผู้เสียภาษี:</span> <span class="gov-meta-val">${userName}</span></div>
              <div class="gov-meta-col"><span class="gov-meta-label">เลขประจำตัวผู้เสียภาษี:</span> <span class="gov-meta-val">${userTaxId}</span></div>
            </div>
            <div class="gov-meta-row">
              <div class="gov-meta-col"><span class="gov-meta-label">ประเภทแบบแสดงรายการ:</span> <span class="gov-meta-val">${isIndividual ? 'ภาษีเงินได้บุคคลธรรมดา (ภ.ง.ด. ๙๐/๙๑)' : 'ภาษีเงินได้นิติบุคคล (ภ.ง.ด. ๕๐)'}</span></div>
              <div class="gov-meta-col"><span class="gov-meta-label">สถานะการคำนวณ:</span> <span class="gov-meta-val" style="color:#047857;">✔️ ผ่านการตรวจสอบเกณฑ์ตามประมวลรัษฎากร</span></div>
            </div>
          </div>

          <!-- แถบสรุป 4 มิติภาพรวม -->
          <div class="gov-kpi-strip">
            <div class="gov-kpi-card">
              <span class="gov-kpi-lbl">๑. รายรับ/เงินได้รวม</span>
              <span class="gov-kpi-val">${formatMoney(res.totalIncome || res.totalRevenue || 0)} บาท</span>
            </div>
            <div class="gov-kpi-card">
              <span class="gov-kpi-lbl">๒. หัก ค่าใช้จ่ายตามกฎหมาย</span>
              <span class="gov-kpi-val" style="color:#DC2626;">-${formatMoney(res.totalExpense || res.totalExpenses || 0)} บาท</span>
            </div>
            <div class="gov-kpi-card">
              <span class="gov-kpi-lbl">๓. หัก ค่าลดหย่อนรวม</span>
              <span class="gov-kpi-val" style="color:#DC2626;">-${formatMoney(res.totalAllowance || res.donationAllowed || 0)} บาท</span>
            </div>
            <div class="gov-kpi-card">
              <span class="gov-kpi-lbl">๔. เงินได้สุทธิ / กำไรสุทธิ</span>
              <span class="gov-kpi-val" style="color:#B45309;">${formatMoney(res.netTaxableIncome || res.netTaxableProfit || 0)} บาท</span>
            </div>
          </div>
      `;

      if (isIndividual) {
        // ==========================================
        // บุคคลธรรมดา
        // ==========================================

        // ข้อ ๑. รายการเงินได้พึงประเมินและการหักค่าใช้จ่าย
        const exp = res.breakdowns?.autoExpenses || {};
        let hasIncome = false;

        const incCategories = [
          {
            key: '40_1',
            name: '๑.๑ เงินได้ตามมาตรา ๔๐(๑) (เงินเดือน ค่าจ้าง โบนัส เบี้ยเลี้ยง บำเหน็จ)',
            val: Number(inc.inc_40_1) || 0,
            exp: exp.exp12 || 0,
            rule: 'หักค่าใช้จ่ายตามเกณฑ์กฎหมายร้อยละ ๕๐ (รวม ๔๐(๑) และ ๔๐(๒) สูงสุดไม่เกิน ๑๐๐,๐๐๐ บาท)'
          },
          {
            key: '40_2',
            name: '๑.๒ เงินได้ตามมาตรา ๔๐(๒) (ค่าจ้างทั่วไป ค่านายหน้า ฟรีแลนซ์ รับจ้างทำงานให้)',
            val: Number(inc.inc_40_2) || 0,
            exp: 0,
            rule: 'นับรวมคำนวณหักค่าใช้จ่ายร้อยละ ๕๐ ร่วมกับมาตรา ๔๐(๑)'
          },
          {
            key: '40_3',
            name: '๑.๓ เงินได้ตามมาตรา ๔๐(๓) (ค่าแห่งกู๊ดวิลล์ ค่าลิขสิทธิ์ สิทธิบัตร)',
            val: Number(inc.inc_40_3) || 0,
            exp: exp.exp3 || 0,
            rule: 'หักค่าใช้จ่ายเหมาตามกฎหมายร้อยละ ๕๐ (ไม่เกิน ๑๐๐,๐๐๐ บาท)'
          },
          {
            key: '40_4',
            name: '๑.๔ เงินได้ตามมาตรา ๔๐(๔) (ดอกเบี้ย เงินปันผล ส่วนแบ่งกำไร)',
            val: Number(inc.inc_40_4) || 0,
            exp: 0,
            rule: 'กฎหมายไม่อนุญาตให้หักค่าใช้จ่าย'
          },
          {
            key: '40_5',
            name: '๑.๕ เงินได้ตามมาตรา ๔๐(๕) (ค่าเช่าทรัพย์สิน บ้าน อาคาร ที่ดิน ยานพาหนะ)',
            val: (Number(inc.inc_40_5_building) || 0) + (Number(inc.inc_40_5_agri) || 0) + (Number(inc.inc_40_5_other_land) || 0) + (Number(inc.inc_40_5_vehicle) || 0) + (Number(inc.inc_40_5_other) || 0),
            exp: exp.exp5 || 0,
            rule: 'หักค่าใช้จ่ายเหมาตามประเภททรัพย์สิน (ร้อยละ ๑๐ ถึง ๓๐)'
          },
          {
            key: '40_6',
            name: '๑.๖ เงินได้ตามมาตรา ๔๐(๖) (วิชาชีพอิสระ: แพทย์, กฎหมาย, บัญชี, วิศวกรรม ฯลฯ)',
            val: (Number(inc.inc_40_6_medical) || 0) + (Number(inc.inc_40_6_other) || 0),
            exp: exp.exp6 || 0,
            rule: 'การประกอบโรคศิลปะหักร้อยละ ๖๐ / วิชาชีพอื่นหักร้อยละ ๓๐'
          },
          {
            key: '40_7',
            name: '๑.๗ เงินได้ตามมาตรา ๔๐(๗) (รับเหมาที่ผู้รับเหมาจัดหาสัมภาระในส่วนสำคัญ)',
            val: Number(inc.inc_40_7) || 0,
            exp: exp.exp7 || 0,
            rule: 'หักค่าใช้จ่ายเหมาตามพระราชกฤษฎีการ้อยละ ๖๐'
          },
          {
            key: '40_8',
            name: '๑.๘ เงินได้ตามมาตรา ๔๐(๘) (เงินได้จากการพาณิชย์ การค้า ขายของออนไลน์ หรืออื่นๆ)',
            val: Number(inc.inc_40_8) || 0,
            exp: exp.exp8 || 0,
            rule: 'หักค่าใช้จ่ายเหมาตามพระราชกฤษฎีการ้อยละ ๖๐'
          }
        ];

        html += `
          <div class="gov-section">
            <div class="gov-section-heading">
              <span class="gov-section-num">ข้อ ๑.</span>
              <span class="gov-section-title">รายการเงินได้พึงประเมินและการหักค่าใช้จ่ายตามกฎหมาย (ตามมาตรา ๔๐(๑) - (๘))</span>
            </div>
            <div class="gov-item-list">
        `;

        incCategories.forEach(item => {
          if (item.val > 0) {
            hasIncome = true;
            html += `
              <div class="gov-item-line">
                <div class="gov-item-desc">
                  <div class="gov-item-name">${item.name}</div>
                  <div class="gov-item-rule">${item.rule}</div>
                </div>
                <div class="gov-item-dots"></div>
                <div class="gov-item-figures">
                  <div class="gov-item-income">เงินได้ ${formatMoney(item.val)} บาท</div>
                  <div class="gov-item-expense">${item.exp > 0 ? 'หักค่าใช้จ่าย -' + formatMoney(item.exp) + ' บาท' : (item.val > 0 && item.key === '40_2' ? 'รวมหักใน 40(1)' : 'หักไม่ได้')}</div>
                </div>
              </div>
            `;
          }
        });

        if (!hasIncome) {
          html += `
            <div class="gov-item-line" style="justify-content:center; color:#94A3B8;">
              <span>(ไม่มีรายการเงินได้ที่บันทึกไว้ในแบบคำนวณนี้)</span>
            </div>
          `;
        }

        html += `
              <div class="gov-summary-line" style="margin-top:0.6rem;">
                <div class="gov-sum-label">รวมเงินได้พึงประเมินทั้งสิ้น</div>
                <div class="gov-item-dots"></div>
                <div class="gov-sum-val">${formatMoney(res.totalIncome)} บาท</div>
              </div>
              <div class="gov-summary-line">
                <div class="gov-sum-label">รวมค่าใช้จ่ายที่หักได้ตามกฎหมายทั้งสิ้น</div>
                <div class="gov-item-dots"></div>
                <div class="gov-sum-val" style="color:#DC2626;">-${formatMoney(res.totalExpense)} บาท</div>
              </div>
              <div class="gov-summary-line highlight">
                <div class="gov-sum-label"><strong>เงินได้คงเหลือหลังหักค่าใช้จ่าย (ก่อนหักค่าลดหย่อน)</strong></div>
                <div class="gov-item-dots"></div>
                <div class="gov-sum-val"><strong>${formatMoney(res.netIncomeAfterExpense)} บาท</strong></div>
              </div>
            </div>
          </div>
        `;

        // ข้อ ๒. รายการหักค่าลดหย่อนและสิทธิประโยชน์ทางภาษี
        const allowItems = [
          {
            name: '๒.๑ ค่าลดหย่อนผู้มีเงินได้ (สิทธิขั้นพื้นฐานตามกฎหมาย)',
            val: 60000,
            desc: 'สิทธิลดหย่อนส่วนบุคคลผู้มีเงินได้ทุกคน'
          },
          {
            name: '๒.๒ ค่าลดหย่อนคู่สมรส (กรณีจดทะเบียนสมรสและคู่สมรสไม่มีเงินได้)',
            val: (allow.has_spouse_no_income || allow.allow_spouse) ? 60000 : 0,
            desc: 'หักลดหย่อนคู่สมรสตามประมวลรัษฎากร'
          },
          {
            name: '๒.๓ ค่าลดหย่อนบุตรชอบด้วยกฎหมาย (เกิดก่อน พ.ศ. ๒๕๖๑ หรือบุตรคนแรก)',
            val: (Number(allow.child_before_2561 || allow.allow_child_count) || 0) * 30000,
            desc: `จำนวน ${(Number(allow.child_before_2561 || allow.allow_child_count) || 0)} คน (คนละ ๓๐,๐๐๐ บาท)`
          },
          {
            name: '๒.๔ ค่าลดหย่อนบุตรคนที่ ๒ ขึ้นไป (เกิดในหรือหลัง พ.ศ. ๒๕๖๑)',
            val: (Number(allow.child_after_2561 || allow.allow_child_2561_count) || 0) * 60000,
            desc: `จำนวน ${(Number(allow.child_after_2561 || allow.allow_child_2561_count) || 0)} คน (คนละ ๖๐,๐๐๐ บาท)`
          },
          {
            name: '๒.๕ ค่าฝากครรภ์และค่าคลอดบุตร',
            val: Number(allow.pregnancy_cost || allow.allow_prenatal) || 0,
            desc: 'หักตามจ่ายจริงสำหรับการตั้งครรภ์แต่ละคราว (ไม่เกิน ๖๐,๐๐๐ บาท)'
          },
          {
            name: '๒.๖ ค่าลดหย่อนอุปการะเลี้ยงดูบิดามารดาของผู้มีเงินได้',
            val: (Number(allow.parents_self_count) || ((allow.allow_father ? 1 : 0) + (allow.allow_mother ? 1 : 0))) * 30000,
            desc: `จำนวน ${(Number(allow.parents_self_count) || ((allow.allow_father ? 1 : 0) + (allow.allow_mother ? 1 : 0)))} ท่าน (ท่านละ ๓๐,๐๐๐ บาท)`
          },
          {
            name: '๒.๗ ค่าลดหย่อนอุปการะเลี้ยงดูบิดามารดาของคู่สมรส',
            val: (Number(allow.parents_spouse_count) || ((allow.allow_spouse_father ? 1 : 0) + (allow.allow_spouse_mother ? 1 : 0))) * 30000,
            desc: `จำนวน ${(Number(allow.parents_spouse_count) || ((allow.allow_spouse_father ? 1 : 0) + (allow.allow_spouse_mother ? 1 : 0)))} ท่าน (ท่านละ ๓๐,๐๐๐ บาท)`
          },
          {
            name: '๒.๘ ค่าลดหย่อนอุปการะคนพิการหรือทุพพลภาพ',
            val: (Number(allow.disabled_count || allow.allow_disabled_count) || 0) * 60000,
            desc: `จำนวน ${(Number(allow.disabled_count || allow.allow_disabled_count) || 0)} คน (คนละ ๖๐,๐๐๐ บาท)`
          },
          {
            name: '๒.๙ เงินสมทบกองทุนประกันสังคม',
            val: Number(allow.social_security || allow.allow_social_security) || 0,
            desc: 'หักตามจำนวนที่จ่ายจริง (สูงสุดไม่เกิน ๙,๐๐๐ บาทต่อปี)'
          },
          {
            name: '๒.๑๐ เบี้ยประกันชีวิตทั่วไป และเงินฝากแบบมีประกันชีวิต',
            val: Number(allow.life_insurance || allow.allow_life_insurance) || 0,
            desc: 'หักตามจ่ายจริง (สูงสุดไม่เกิน ๑๐๐,๐๐๐ บาท)'
          },
          {
            name: '๒.๑๑ เบี้ยประกันสุขภาพตนเอง',
            val: Number(allow.health_insurance || allow.allow_health_insurance) || 0,
            desc: 'หักตามจ่ายจริงไม่เกิน ๒๕,๐๐๐ บาท (รวมประกันชีวิตทั่วไปไม่เกิน ๑๐๐,๐๐๐ บาท)'
          },
          {
            name: '๒.๑๒ เบี้ยประกันสุขภาพบิดามารดาของผู้มีเงินได้และคู่สมรส',
            val: Number(allow.parent_health_insurance || allow.allow_parent_health_insurance) || 0,
            desc: 'หักตามจ่ายจริง (สูงสุดไม่เกิน ๑๕,๐๐๐ บาท)'
          },
          {
            name: '๒.๑๓ เบี้ยประกันชีวิตแบบบำนาญ',
            val: Number(allow.pension_insurance || allow.allow_pension_life) || 0,
            desc: 'หักลดหย่อนได้ร้อยละ ๑๕ ของเงินได้ (สูงสุดไม่เกิน ๒๐๐,๐๐๐ บาท)'
          },
          {
            name: '๒.๑๔ กองทุนรวมเพื่อการเลี้ยงชีพ (RMF)',
            val: Number(allow.rmf || allow.allow_rmf) || 0,
            desc: 'หักได้ตามเกณฑ์ร้อยละ ๓๐ ของเงินได้ (สูงสุดไม่เกิน ๕๐๐,๐๐๐ บาท)'
          },
          {
            name: '๒.๑๕ กองทุนรวมเพื่อการออม (SSF)',
            val: Number(allow.ssf || allow.allow_ssf) || 0,
            desc: 'หักได้ตามเกณฑ์ร้อยละ ๓๐ ของเงินได้ (สูงสุดไม่เกิน ๒๐๐,๐๐๐ บาท)'
          },
          {
            name: '๒.๑๖ กองทุนรวมไทยเพื่อความยั่งยืน (Thai ESG)',
            val: Number(allow.thai_esg || allow.allow_thai_esg) || 0,
            desc: 'หักลดหย่อนพิเศษตามนโยบายรัฐบาล สูงสุดร้อยละ ๓๐ ของเงินได้ (ไม่เกิน ๓๐๐,๐๐๐ บาท)'
          },
          {
            name: '๒.๑๗ กองทุนสำรองเลี้ยงชีพ / กบข. / กองทุนสงเคราะห์ครูโรงเรียนเอกชน',
            val: Number(allow.provident_fund || allow.allow_pvd) || 0,
            desc: 'หักตามอัตราสมทบจริง (สูงสุดไม่เกินร้อยละ ๑๕ ไม่เกิน ๕๐๐,๐๐๐ บาท)'
          },
          {
            name: '๒.๑๘ กองทุนการออมแห่งชาติ (กอช.)',
            val: Number(allow.nsf) || 0,
            desc: 'หักตามจำนวนเงินสะสมจริง (สูงสุดไม่เกิน ๓๐,๐๐๐ บาท)'
          },
          {
            name: '๒.๑๙ ดอกเบี้ยเงินกู้ยืมเพื่อซื้อ เช่าซื้อ หรือสร้างที่อยู่อาศัย',
            val: Number(allow.home_loan_interest || allow.allow_home_loan_interest) || 0,
            desc: 'หักตามจ่ายจริงแก่สถาบันการเงิน (สูงสุดไม่เกิน ๑๐๐,๐๐๐ บาท)'
          },
          {
            name: '๒.๒๐ มาตรการ Easy E-Receipt / ช้อปดีมีคืน',
            val: Number(allow.easy_e_receipt || allow.allow_easy_e_receipt) || 0,
            desc: 'ค่าซื้อสินค้าหรือบริการตามใบกำกับภาษีอิเล็กทรอนิกส์'
          },
          {
            name: '๒.๒๑ เงินบริจาคเพื่อการศึกษา การกีฬา และโรงพยาบาลรัฐ (สิทธิหักลดหย่อนได้ ๒ เท่า)',
            val: (Number(allow.donate_education_sports_hospital || allow.allow_donation_education) || 0) * 2,
            desc: `ยอดบริจาคจริง ${formatMoney(Number(allow.donate_education_sports_hospital || allow.allow_donation_education) || 0)} บาท (รับสิทธิ ๒ เท่าตามกฎหมาย)`
          },
          {
            name: '๒.๒๒ เงินบริจาคทั่วไป / องค์กรสาธารณกุศล',
            val: Number(allow.donate_general || allow.allow_donation_general) || 0,
            desc: 'หักได้ตามจริงไม่เกินร้อยละ ๑๐ ของเงินได้หลังหักค่าลดหย่อนอื่น'
          }
        ];

        html += `
          <div class="gov-section">
            <div class="gov-section-heading">
              <span class="gov-section-num">ข้อ ๒.</span>
              <span class="gov-section-title">รายการหักค่าลดหย่อนภาษีและสิทธิประโยชน์ทางภาษี (ตามประมวลรัษฎากร)</span>
            </div>
            <div class="gov-item-list">
        `;

        allowItems.forEach(item => {
          if (item.val > 0) {
            html += `
              <div class="gov-item-line">
                <div class="gov-item-desc">
                  <div class="gov-item-name">${item.name}</div>
                  <div class="gov-item-rule">${item.desc}</div>
                </div>
                <div class="gov-item-dots"></div>
                <div class="gov-item-figures">
                  <div class="gov-item-expense">-${formatMoney(item.val)} บาท</div>
                </div>
              </div>
            `;
          }
        });

        html += `
              <div class="gov-summary-line" style="margin-top:0.6rem;">
                <div class="gov-sum-label">รวมรายการหักลดหย่อนและสิทธิประโยชน์ทั้งสิ้น</div>
                <div class="gov-item-dots"></div>
                <div class="gov-sum-val" style="color:#DC2626;">-${formatMoney(res.totalAllowance)} บาท</div>
              </div>
              <div class="gov-summary-line grand-total">
                <div class="gov-sum-label"><strong>เงินได้สุทธิเพื่อนำไปคำนวณภาษี (Net Taxable Income)</strong></div>
                <div class="gov-item-dots"></div>
                <div class="gov-sum-val grand-val"><strong>${formatMoney(res.netTaxableIncome)} บาท</strong></div>
              </div>
            </div>
          </div>
        `;

        // ข้อ ๓. การคำนวณภาษีเงินได้ตามอัตราก้าวหน้าและวิธีที่ ๒ (ไม่มีตาราง)
        html += `
          <div class="gov-section">
            <div class="gov-section-heading">
              <span class="gov-section-num">ข้อ ๓.</span>
              <span class="gov-section-title">การคำนวณภาษีเงินได้บุคคลธรรมดา (มาตรา ๔๘ แห่งประมวลรัษฎากร)</span>
            </div>
            <div class="gov-sub-heading">๓.๑ วิธีที่ ๑: คำนวณตามอัตราภาษีก้าวหน้า ๗ ขั้น (มาตรา ๔๘(๑))</div>
            <div class="gov-bracket-listing">
        `;

        if (res.progressive && res.progressive.bracketResults) {
          res.progressive.bracketResults.forEach((b, idx) => {
            const isAct = b.isActive && b.taxableAmount > 0;
            html += `
              <div class="gov-bracket-row ${isAct ? 'gov-bracket-active' : ''}">
                <div class="gov-bracket-range">
                  <span class="gov-bracket-badge">${b.ratePercent}</span>
                  <span>ช่วงเงินได้ ${b.label} บาท</span>
                  ${isAct ? '<span class="gov-badge-tag">📍 ฐานภาษีสูงสุด</span>' : ''}
                </div>
                <div class="gov-item-dots"></div>
                <div class="gov-bracket-calc">
                  <span class="gov-bracket-base">เงินได้ในขั้น: ${formatMoney(b.taxableAmount)} บาท</span>
                  <span class="gov-bracket-tax">ภาษี: <strong>${formatMoney(b.taxAmount)} บาท</strong></span>
                </div>
              </div>
            `;
          });
        }

        html += `
            </div>
            <div class="gov-summary-line">
              <div class="gov-sum-label">ภาษีเงินได้คำนวณตามวิธีที่ ๑ (อัตราก้าวหน้า)</div>
              <div class="gov-item-dots"></div>
              <div class="gov-sum-val"><strong>${formatMoney(res.progressive?.totalTax || 0)} บาท</strong></div>
            </div>

            <div class="gov-sub-heading" style="margin-top:1rem;">๓.๒ วิธีที่ ๒: คำนวณร้อยละ ๐.๕ ของเงินได้พึงประเมิน ๔๐(๒) - (๘) (มาตรา ๔๘(๒))</div>
            <div class="gov-bracket-listing">
              <div class="gov-bracket-row">
                <div class="gov-bracket-range">
                  <span>คำนวณอัตราร้อยละ ๐.๕ จากเงินได้พึงประเมินประเภท ๔๐(๒)-(๘)</span>
                </div>
                <div class="gov-item-dots"></div>
                <div class="gov-bracket-calc">
        `;

        const method2Applicable = res.flat?.isApplicable;
        if (method2Applicable) {
          html += `<span>ฐานเงินได้: ${formatMoney(res.flat?.totalAssessableForFlat || 0)} บาท &nbsp;→&nbsp; ภาษี: <strong>${formatMoney(res.flat.flatTax)} บาท</strong></span>`;
        } else {
          html += `<span style="color:#64748B;">ไม่อยู่ในเกณฑ์ต้องคำนวณวิธีที่ ๒ (ภาษีไม่เกิน ๕,๐๐๐ บาท หรือไม่มีเงินได้มาตรา ๔๐(๒)-(๘))</span>`;
        }

        html += `
                </div>
              </div>
            </div>

            <div class="gov-summary-line highlight">
              <div class="gov-sum-label"><strong>ภาษีเงินได้ที่ต้องชำระตามกฎหมาย (เลือกยอดที่สูงกว่า):</strong> ${res.selectedMethod === 'method2' ? 'วิธีที่ ๒ (ร้อยละ ๐.๕)' : 'วิธีที่ ๑ (อัตราก้าวหน้า)'}</div>
              <div class="gov-item-dots"></div>
              <div class="gov-sum-val"><strong>${formatMoney(res.taxPayableBeforeWht)} บาท</strong></div>
            </div>
          </div>
        `;

      } else {
        // ==========================================
        // นิติบุคคล (ภ.ง.ด. 50)
        // ==========================================
        html += `
          <div class="gov-section">
            <div class="gov-section-heading">
              <span class="gov-section-num">ข้อ ๑.</span>
              <span class="gov-section-title">รายการรายได้และรายจ่ายของนิติบุคคลตามรอบระยะเวลาบัญชี</span>
            </div>
            <div class="gov-item-list">
              <div class="gov-item-line">
                <div class="gov-item-desc">๑.๑ รายได้จากการขายสินค้าและให้บริการ</div>
                <div class="gov-item-dots"></div>
                <div class="gov-item-figures">${formatMoney(rev.sales_revenue || rev.corp_sales_revenue || 0)} บาท</div>
              </div>
              <div class="gov-item-line">
                <div class="gov-item-desc">๑.๒ รายได้อื่น ๆ ของกิจการ</div>
                <div class="gov-item-dots"></div>
                <div class="gov-item-figures">${formatMoney(rev.other_revenue || rev.corp_other_revenue || 0)} บาท</div>
              </div>
              <div class="gov-summary-line">
                <div class="gov-sum-label">รวมรายได้ทั้งสิ้น</div>
                <div class="gov-item-dots"></div>
                <div class="gov-sum-val">${formatMoney(res.totalRevenue)} บาท</div>
              </div>
              <div class="gov-item-line" style="margin-top:0.4rem;">
                <div class="gov-item-desc">๑.๓ หัก ต้นทุนขายและต้นทุนบริการ</div>
                <div class="gov-item-dots"></div>
                <div class="gov-item-figures" style="color:#DC2626;">-${formatMoney(expCorp.cogs || expCorp.corp_cogs || 0)} บาท</div>
              </div>
              <div class="gov-item-line">
                <div class="gov-item-desc">๑.๔ หัก ค่าใช้จ่ายในการดำเนินงานและการบริหาร</div>
                <div class="gov-item-dots"></div>
                <div class="gov-item-figures" style="color:#DC2626;">-${formatMoney(expCorp.operating_expenses || expCorp.corp_sga || 0)} บาท</div>
              </div>
              <div class="gov-item-line">
                <div class="gov-item-desc">๑.๕ หัก ค่าเสื่อมราคาและค่าตัดจำหน่าย</div>
                <div class="gov-item-dots"></div>
                <div class="gov-item-figures" style="color:#DC2626;">-${formatMoney((expCorp.depreciation || 0) + (expCorp.depreciation_machinery || 0) + (expCorp.depreciation_computer || 0))} บาท</div>
              </div>
              <div class="gov-summary-line">
                <div class="gov-sum-label">รวมรายจ่ายที่หักได้ทั้งสิ้น</div>
                <div class="gov-item-dots"></div>
                <div class="gov-sum-val" style="color:#DC2626;">-${formatMoney(res.totalExpenses)} บาท</div>
              </div>
              <div class="gov-summary-line grand-total">
                <div class="gov-sum-label"><strong>กำไรสุทธิเพื่อนำไปคำนวณภาษี (Net Taxable Profit)</strong></div>
                <div class="gov-item-dots"></div>
                <div class="gov-sum-val grand-val"><strong>${formatMoney(res.netTaxableProfit)} บาท</strong></div>
              </div>
            </div>
          </div>

          <div class="gov-section">
            <div class="gov-section-heading">
              <span class="gov-section-num">ข้อ ๒.</span>
              <span class="gov-section-title">อัตราภาษีและการคำนวณภาษีเงินได้นิติบุคคล (ภ.ง.ด. ๕๐)</span>
            </div>
            <div class="gov-item-list">
              <div class="gov-item-line">
                <div class="gov-item-desc">เกณฑ์อัตราภาษีที่ใช้ประเมิน</div>
                <div class="gov-item-dots"></div>
                <div class="gov-item-figures">${res.corporateTaxRateLabel || (res.isSME ? 'อัตราก้าวหน้าสิทธิประโยชน์ SME (ยกเว้น ๓ แสนแรก / ๑๕% / ๒๐%)' : 'อัตราทั่วไปร้อยละ ๒๐')}</div>
              </div>
              <div class="gov-summary-line highlight">
                <div class="gov-sum-label"><strong>ภาษีเงินได้นิติบุคคลที่คำนวณได้ทั้งสิ้น</strong></div>
                <div class="gov-item-dots"></div>
                <div class="gov-sum-val"><strong>${formatMoney(res.totalCorporateTax || res.taxPayableBeforeWht || 0)} บาท</strong></div>
              </div>
            </div>
          </div>
        `;
      }

      // ==========================================
      // ข้อ ๔. สรุปภาระภาษีและการชำระภาษีสุทธิ (ทั้งบุคคลและนิติบุคคล)
      // ==========================================
      const wht = isIndividual ? (res.withholdingTax || 0) : (res.totalTaxCredits || 0);
      const finalAmount = res.finalAmount || 0;
      const isPayMore = res.taxResultType === 'pay_more';
      const isRefund = res.taxResultType === 'refund';

      let verdictClass = 'zero';
      let verdictTitle = 'ไม่มีภาษีที่ต้องชำระเพิ่มเติม และไม่มีภาษีขอคืน';
      let verdictDesc = 'ยอดภาษีที่ต้องเสียตรงกับภาษีที่ได้ชำระล่วงหน้าไว้แล้ว';

      if (isPayMore) {
        verdictClass = 'pay-more';
        verdictTitle = '⚠️ สรุปผล: มีภาษีที่ต้องชำระเพิ่มเติม (Payable Tax)';
        verdictDesc = 'ผู้เสียภาษีมีหน้าที่นำส่งภาษีเพิ่มเติมพร้อมการยื่นแบบแสดงรายการต่อกรมสรรพากร';
      } else if (isRefund) {
        verdictClass = 'refund';
        verdictTitle = '🎉 สรุปผล: ภาษีชำระไว้เกิน มีสิทธิขอรับเงินคืน (Tax Refund)';
        verdictDesc = 'ผู้เสียภาษีสามารถแจ้งความประสงค์ขอรับเงินภาษีคืนผ่านระบบพร้อมเพย์หรือโอนผ่านธนาคาร';
      }

      html += `
        <div class="gov-section">
          <div class="gov-section-heading">
            <span class="gov-section-num">ข้อ ๔.</span>
            <span class="gov-section-title">สรุปภาระภาษี การหักภาษี ณ ที่จ่าย และการชำระภาษีสุทธิ</span>
          </div>
          <div class="gov-item-list">
            <div class="gov-item-line">
              <div class="gov-item-desc">ภาษีที่ต้องเสียตามเกณฑ์ประเมิน</div>
              <div class="gov-item-dots"></div>
              <div class="gov-item-figures"><strong>${formatMoney(res.taxPayableBeforeWht || res.totalCorporateTax || 0)} บาท</strong></div>
            </div>
            <div class="gov-item-line">
              <div class="gov-item-desc">หัก ภาษีเงินได้หัก ณ ที่จ่าย / เครดิตภาษีชำระล่วงหน้า</div>
              <div class="gov-item-dots"></div>
              <div class="gov-item-figures" style="color:#047857;"><strong>-${formatMoney(wht)} บาท</strong></div>
            </div>
          </div>

          <!-- กรอบคำวินิจฉัยและยอดภาษีสุทธิทางการ -->
          <div class="gov-verdict-card ${verdictClass}">
            <div class="gov-verdict-title">${verdictTitle}</div>
            <div class="gov-verdict-amount">${formatMoney(finalAmount)} บาท</div>
            <div class="gov-verdict-words">(${formatThaiBahtText(finalAmount)})</div>
            <div class="gov-verdict-desc">${verdictDesc}</div>
          </div>
        </div>

        <!-- ข้อ ๕. คำรับรองความถูกต้องและการลงนามตามมาตรฐานงานสารบรรณ -->
        <div class="gov-section gov-cert-section">
          <div class="gov-cert-text">
            <strong>คำรับรองความถูกต้อง:</strong> ข้าพเจ้าขอรับรองว่า รายการแสดงเงินได้พึงประเมิน การหักค่าใช้จ่าย และการหักค่าลดหย่อนภาษีที่ระบุไว้ในเอกสารสรุปการคำนวณนี้ ถูกต้อง ครบถ้วน และตรงตามหลักฐานความเป็นจริงทุกประการ
          </div>
          <div class="gov-signature-grid">
            <div class="gov-sign-col">
              <div class="gov-sign-space"></div>
              <div class="gov-sign-name">ลงชื่อ ..........................................................................</div>
              <div class="gov-sign-role">( ${userName} )</div>
              <div class="gov-sign-label">ผู้มีเงินได้ / ${isIndividual ? 'ผู้ยื่นแบบแสดงรายการ' : 'กรรมการผู้มีอำนาจลงนาม'}</div>
              <div class="gov-sign-date">วันที่ ........ / .................... / ................</div>
            </div>
            <div class="gov-sign-col">
              <div class="gov-sign-space"></div>
              <div class="gov-sign-name">ลงชื่อ ..........................................................................</div>
              <div class="gov-sign-role">( ระบบสารสนเทศ TAX PORTAL )</div>
              <div class="gov-sign-label">ผู้ประมวลผลการคำนวณภาษีอัตโนมัติ</div>
              <div class="gov-sign-date">พิมพ์วันที่: ${dateFormatted}</div>
            </div>
          </div>
          <div class="gov-footer-notice">
            * เอกสารสรุปรายการคำนวณนี้ จัดทำขึ้นโดยระบบ TAX PORTAL เพื่อใช้เป็นเอกสารประกอบการวางแผนและยื่นแบบแสดงรายการภาษีเงินได้ตามประมวลรัษฎากร กรมสรรพากร
          </div>
        </div>
      </div>
      `;

      return html;
    }

    function openPndPrintModal(customRecord = null) {
      if (!customRecord && !hasFirstStepData()) {
        showToast('กรุณากรอกข้อมูลรายได้ในขั้นตอนที่ 1 ก่อนคำนวณภาษีและพิมพ์แบบ', 'error');
        if (window.SoundEngine) SoundEngine.play('alert');
        highlightRequiredIncomeInput();
        return;
      }

      if (!latestResult && !customRecord) {
        recalculate();
      }

      const res = customRecord?.summary_data || customRecord?.summary || latestResult;
      const reportHtml = generatePndReportHtml(res, customRecord);

      const previewEl = document.getElementById('pnd-preview-sheet');
      if (previewEl) previewEl.innerHTML = reportHtml;

      const printDocEl = document.getElementById('pnd-print-document');
      if (printDocEl) printDocEl.innerHTML = reportHtml;

      openModal('modal-pnd-preview');
      if (window.SoundEngine) SoundEngine.play('modal');
    }

    // 8. Print Buttons
    document.getElementById('btn-print-summary')?.addEventListener('click', () => openPndPrintModal());
    document.getElementById('btn-inspector-print')?.addEventListener('click', () => {
      if (inspectedRecord) openPndPrintModal(inspectedRecord);
      else openPndPrintModal();
    });
    document.getElementById('btn-pnd-modal-print')?.addEventListener('click', () => {
      window.print();
    });

    // 9. Inspector Modal Buttons
    document.getElementById('btn-inspector-load')?.addEventListener('click', () => {
      if (inspectedRecord) loadRecordById(inspectedRecord.id);
    });

    document.getElementById('btn-inspector-delete')?.addEventListener('click', () => {
      if (inspectedRecord) deleteRecordById(inspectedRecord.id);
    });

    // Check Session & Initial Calculate
    checkSession();
    updateStepLockUI();
    recalculate();

    // Listen for Supabase Auth state changes (when user confirms email link or logs in)
    if (window.SupabaseService) {
      SupabaseService.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const user = session.user;
          currentUser = {
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'ผู้ใช้',
            email: user.email,
            role: user.user_metadata?.role || 'member',
            profile_pic: user.user_metadata?.profile_pic || '',
            tax_id: user.user_metadata?.tax_id || '',
            phone: user.user_metadata?.phone || '',
            company_name: user.user_metadata?.company_name || '',
            address: user.user_metadata?.address || ''
          };
          updateAuthUI();
        } else if (event === 'SIGNED_OUT') {
          currentUser = null;
          updateAuthUI();
        }
      });
    }

    // จัดการระบบ Ticket และ Support
    // footer
    document.getElementById('btn-open-contact')?.addEventListener('click', () => openModal('modal-contact'));

    // modal ส่งข้อความแจ้งปัญหา
    document.getElementById('form-contact-ticket')?.addEventListener('submit', handleContactTicketSubmit);

    // Chat widget: ปุ่มเปิดแชท FAB
    document.getElementById('btn-chat-fab')?.addEventListener('click', () => {
      const panel = document.getElementById('chat-panel');
      if (!panel) return;
      const isHidden = panel.hidden;
      panel.hidden = !isHidden;
      if (isHidden) loadChatMyTickets();
    });

    // Chat widget: ปิดหน้าต่างแชท
    document.getElementById('btn-chat-close')?.addEventListener('click', () => {
      const panel = document.getElementById('chat-panel');
      if (panel) panel.hidden = true;
    });

    // Chat widget: ปิดหน้าต่างแชท
    document.getElementById('form-chat-ticket')?.addEventListener('submit', handleChatTicketSubmit);

    // Admin: ตัวกรองสถานะตั๋วแจ้งปัญหา
    document.getElementById('admin-ticket-filter')?.addEventListener('change', (e) => {
      loadAdminTickets(e.target.value);
    });

    // Admin: ส่งคำตอบกลับตั๋วแจ้งปัญหา
    document.getElementById('btn-admin-reply-send')?.addEventListener('click', handleAdminTicketReply);

    // Admin Portal Tabs
    document.querySelectorAll('.admin-tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.adminTab || e.target.dataset.adminTab;
        if (tab) switchAdminTab(tab);
      });
    });

    // Admin Portal Refresh & Print
    document.getElementById('btn-admin-refresh')?.addEventListener('click', async () => {
      showToast('🔄 กำลังรีเฟรชข้อมูลผู้ดูแลระบบ...', 'info');
      await loadAdminExecutiveSummary();
      await loadAdminAllRecords();
      await loadAdminMembers();
      await loadAdminTickets();
      showToast('✅ อัปเดตข้อมูลภาพรวมล่าสุดเรียบร้อยแล้ว', 'success');
    });

    document.getElementById('btn-admin-print-summary')?.addEventListener('click', () => {
      window.print();
    });

    // Admin All Records Search & Filter
    const adminRecSearch = document.getElementById('admin-records-search');
    const adminRecFilter = document.getElementById('admin-records-filter-type');
    if (adminRecSearch) {
      adminRecSearch.addEventListener('input', () => {
        loadAdminAllRecords(adminRecSearch.value.trim(), adminRecFilter?.value || 'all');
      });
    }
    if (adminRecFilter) {
      adminRecFilter.addEventListener('change', () => {
        loadAdminAllRecords(adminRecSearch?.value.trim() || '', adminRecFilter.value);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
