/**
 * js/tax-engine.js
 * Thailand Tax Engine (เกณฑ์ปีล่าสุด 2567 / 2568)
 * รองรับทั้ง "บุคคลธรรมดา (ภ.ง.ด. 90/91)" และ "นิติบุคคล (ภ.ง.ด. 50/51)"
 * หักค่าใช้จ่ายบุคคลธรรมดาอัตโนมัติตามกฎหมาย 100%
 * คำนวณภาษีนิติบุคคลทั่วไป (20%) และ อัตราลดหย่อนสำหรับ SME (0%, 15%, 20%)
 */

const TaxEngine = (function () {
  'use strict';

  // ตารางอัตราภาษีเงินได้บุคคลธรรมดาแบบขั้นบันได
  const INDIVIDUAL_TAX_BRACKETS = [
    { min: 0, max: 150000, rate: 0.0, label: '0 - 150,000 บาท', maxTaxInBracket: 0 },
    { min: 150000, max: 300000, rate: 0.05, label: '150,001 - 300,000 บาท', maxTaxInBracket: 7500 },
    { min: 300000, max: 500000, rate: 0.10, label: '300,001 - 500,000 บาท', maxTaxInBracket: 20000 },
    { min: 500000, max: 750000, rate: 0.15, label: '500,001 - 750,000 บาท', maxTaxInBracket: 37500 },
    { min: 750000, max: 1000000, rate: 0.20, label: '750,001 - 1,000,000 บาท', maxTaxInBracket: 50000 },
    { min: 1000000, max: 2000000, rate: 0.25, label: '1,000,001 - 2,000,000 บาท', maxTaxInBracket: 250000 },
    { min: 2000000, max: 5000000, rate: 0.30, label: '2,000,001 - 5,000,000 บาท', maxTaxInBracket: 900000 },
    { min: 5000000, max: Infinity, rate: 0.35, label: 'เกิน 5,000,000 บาท ขึ้นไป', maxTaxInBracket: Infinity }
  ];

  // ตารางอัตราภาษีเงินได้นิติบุคคลสำหรับวิสาหกิจขนาดกลางและขนาดย่อม (SME)
  const CORPORATE_SME_BRACKETS = [
    { min: 0, max: 300000, rate: 0.0, label: 'กำไรสุทธิ 0 - 300,000 บาท (ยกเว้นภาษี)', ratePercent: '0%' },
    { min: 300000, max: 3000000, rate: 0.15, label: 'กำไรสุทธิ 300,001 - 3,000,000 บาท', ratePercent: '15%' },
    { min: 3000000, max: Infinity, rate: 0.20, label: 'กำไรสุทธิส่วนที่เกิน 3,000,000 บาท', ratePercent: '20%' }
  ];

  // =========================================================================
  // 1. ส่วนของบุคคลธรรมดา (INDIVIDUAL TAX)
  // =========================================================================

  /**
   * คำนวณค่าใช้จ่ายอัตโนมัติตามเกณฑ์กฎหมายสรรพากร (Auto Expense Deduction)
   * ผู้ใช้ไม่ต้องกรอกเอง ระบบคำนวณเหมาตามพระราชกฤษฎีกา
   */
  function calculateIndividualAutoExpenses(incomes) {
    // 40(1) และ 40(2) รวมกันหักได้ 50% แต่สูงสุดไม่เกิน 100,000 บาท
    const inc1 = Number(incomes.inc_40_1) || 0;
    const inc2 = Number(incomes.inc_40_2) || 0;
    const sum12 = inc1 + inc2;
    const exp12 = Math.min(sum12 * 0.5, 100000);

    // 40(3) ค่าลิขสิทธิ์: 50% ไม่เกิน 100,000 บาท
    const inc3 = Number(incomes.inc_40_3) || 0;
    const exp3 = Math.min(inc3 * 0.5, 100000);

    // 40(4) ดอกเบี้ย เงินปันผล: หักไม่ได้
    const exp4 = 0;

    // 40(5) ค่าเช่าทรัพย์สิน (หักเหมาตามประเภททรัพย์สิน)
    const inc5_building = Number(incomes.inc_40_5_building) || 0;
    const inc5_agri = Number(incomes.inc_40_5_agri) || 0;
    const inc5_other_land = Number(incomes.inc_40_5_other_land) || 0;
    const inc5_vehicle = Number(incomes.inc_40_5_vehicle) || 0;
    const inc5_other = Number(incomes.inc_40_5_other) || 0;

    const exp5_building = inc5_building * 0.30; // 30%
    const exp5_agri = inc5_agri * 0.20;         // 20%
    const exp5_other_land = inc5_other_land * 0.15; // 15%
    const exp5_vehicle = inc5_vehicle * 0.30;   // 30%
    const exp5_other = inc5_other * 0.10;       // 10%
    const exp5 = exp5_building + exp5_agri + exp5_other_land + exp5_vehicle + exp5_other;

    // 40(6) วิชาชีพอิสระ
    const inc6_medical = Number(incomes.inc_40_6_medical) || 0;
    const inc6_other = Number(incomes.inc_40_6_other) || 0;
    const exp6_medical = inc6_medical * 0.60;   // ประกอบโรคศิลปะ 60%
    const exp6_other = inc6_other * 0.30;       // บัญชี กฎหมาย วิศวะ สถาปัตย์ 30%
    const exp6 = exp6_medical + exp6_other;

    // 40(7) รับเหมาที่ต้องจัดหาสัมภาระ: 60%
    const inc7 = Number(incomes.inc_40_7) || 0;
    const exp7 = inc7 * 0.60;

    // 40(8) ธุรกิจ การค้า ขายของออนไลน์ อื่นๆ: 60%
    const inc8 = Number(incomes.inc_40_8) || 0;
    const exp8 = inc8 * 0.60;

    const totalExpense = exp12 + exp3 + exp4 + exp5 + exp6 + exp7 + exp8;

    return {
      exp_40_1_2: exp12,
      exp_40_3: exp3,
      exp_40_4: exp4,
      exp_40_5: exp5,
      exp_40_5_building: exp5_building,
      exp_40_5_agri: exp5_agri,
      exp_40_5_other_land: exp5_other_land,
      exp_40_5_vehicle: exp5_vehicle,
      exp_40_5_other: exp5_other,
      exp_40_6: exp6,
      exp_40_6_medical: exp6_medical,
      exp_40_6_other: exp6_other,
      exp_40_7: exp7,
      exp_40_8: exp8,
      totalExpense
    };
  }

  /**
   * คำนวณค่าลดหย่อนบุคคลธรรมดาครบทุกหมวด
   */
  function calculateIndividualAllowances(allowances, totalIncome, netAfterExpense) {
    const details = {};

    // หมวด 1: ส่วนตัวและครอบครัว
    details.self = 60000;
    details.spouse = allowances.has_spouse_no_income ? 60000 : 0;
    const childBefore = Math.max(0, parseInt(allowances.child_before_2561, 10) || 0);
    const childAfter2561 = Math.max(0, parseInt(allowances.child_after_2561, 10) || 0);
    details.children = (childBefore * 30000) + (childAfter2561 * 60000);
    const pregnancyCost = Math.max(0, Number(allowances.pregnancy_cost) || 0);
    details.pregnancy = Math.min(pregnancyCost, 60000);
    const parentsSelf = Math.min(2, Math.max(0, parseInt(allowances.parents_self_count, 10) || 0));
    const parentsSpouse = allowances.has_spouse_no_income
      ? Math.min(2, Math.max(0, parseInt(allowances.parents_spouse_count, 10) || 0))
      : 0;
    details.parents = (parentsSelf + parentsSpouse) * 30000;
    const disabledCount = Math.max(0, parseInt(allowances.disabled_count, 10) || 0);
    details.disabled = disabledCount * 60000;

    const group1Total = details.self + details.spouse + details.children + details.pregnancy + details.parents + details.disabled;

    // หมวด 2: ประกัน เงินออม และการลงทุน
    const socialSecurity = Math.max(0, Number(allowances.social_security) || 0);
    details.socialSecurity = Math.min(socialSecurity, 9000);

    const lifeInsurance = Math.max(0, Number(allowances.life_insurance) || 0);
    const healthInsurance = Math.max(0, Number(allowances.health_insurance) || 0);
    const cappedHealth = Math.min(healthInsurance, 25000);
    const lifeAndHealthCombined = Math.min(lifeInsurance + cappedHealth, 100000);
    details.lifeAndHealth = lifeAndHealthCombined;

    const parentHealthInsurance = Math.max(0, Number(allowances.parent_health_insurance) || 0);
    details.parentHealth = Math.min(parentHealthInsurance, 15000);

    const spouseInsurance = allowances.has_spouse_no_income
      ? Math.min(Math.max(0, Number(allowances.spouse_insurance) || 0), 10000)
      : 0;
    details.spouseInsurance = spouseInsurance;

    // กลุ่มเกษียณอายุ (Retirement Cap 500,000 บาท)
    const pvd = Math.min(Math.max(0, Number(allowances.provident_fund) || 0), totalIncome * 0.15, 500000);
    const nsf = Math.min(Math.max(0, Number(allowances.nsf) || 0), 30000);
    const pensionInsurance = Math.min(Math.max(0, Number(allowances.pension_insurance) || 0), totalIncome * 0.15, 200000);
    const rmf = Math.min(Math.max(0, Number(allowances.rmf) || 0), totalIncome * 0.30, 500000);
    const ssf = Math.min(Math.max(0, Number(allowances.ssf) || 0), totalIncome * 0.30, 200000);

    const rawRetirementTotal = pvd + nsf + pensionInsurance + rmf + ssf;
    const cappedRetirementTotal = Math.min(rawRetirementTotal, 500000);
    details.retirement = {
      pvd, nsf, pensionInsurance, rmf, ssf,
      rawTotal: rawRetirementTotal,
      cappedTotal: cappedRetirementTotal,
      isExceeded: rawRetirementTotal > 500000
    };

    // กองทุน Thai ESG (เกณฑ์ใหม่ 2567-2569: แยกเพดานพิเศษ 300,000 บาท)
    const thaiEsgRaw = Math.max(0, Number(allowances.thai_esg) || 0);
    const thaiEsgCapped = Math.min(thaiEsgRaw, totalIncome * 0.30, 300000);
    details.thaiEsg = thaiEsgCapped;

    const group2Total = details.socialSecurity + details.lifeAndHealth + details.parentHealth + details.spouseInsurance + cappedRetirementTotal + thaiEsgCapped;

    // หมวด 3: อสังหาริมทรัพย์และมาตรการรัฐ
    const homeLoanInterest = Math.max(0, Number(allowances.home_loan_interest) || 0);
    details.homeLoanInterest = Math.min(homeLoanInterest, 100000);

    const easyEReceipt = Math.max(0, Number(allowances.easy_e_receipt) || 0);
    details.easyEReceipt = Math.min(easyEReceipt, 50000);

    const group3Total = details.homeLoanInterest + details.easyEReceipt;

    const subtotalBeforeDonation = group1Total + group2Total + group3Total;

    // หมวด 4: เงินบริจาค (ไม่เกิน 10% ของเงินได้คงเหลือ)
    const remainingBeforeDonation = Math.max(0, netAfterExpense - subtotalBeforeDonation);
    const maxDonationLimit = remainingBeforeDonation * 0.10;

    const donateDoubleRaw = Math.max(0, Number(allowances.donate_education_sports_hospital) || 0);
    const donateDoubleCalculated = donateDoubleRaw * 2;
    const donateDoubleDeduction = Math.min(donateDoubleCalculated, maxDonationLimit);

    const remainingDonationCap = Math.max(0, maxDonationLimit - donateDoubleDeduction);
    const donateGeneralRaw = Math.max(0, Number(allowances.donate_general) || 0);
    const donateGeneralDeduction = Math.min(donateGeneralRaw, remainingDonationCap);

    const donatePoliticsRaw = Math.max(0, Number(allowances.donate_politics) || 0);
    const donatePoliticsDeduction = Math.min(donatePoliticsRaw, 10000);

    const donationTotal = donateDoubleDeduction + donateGeneralDeduction + donatePoliticsDeduction;

    details.donation = {
      doubleRaw: donateDoubleRaw,
      doubleDeduction: donateDoubleDeduction,
      generalRaw: donateGeneralRaw,
      generalDeduction: donateGeneralDeduction,
      politicsDeduction: donatePoliticsDeduction,
      maxLimit: maxDonationLimit,
      total: donationTotal
    };

    const totalAllowance = subtotalBeforeDonation + donationTotal;

    return {
      group1Total,
      group2Total,
      group3Total,
      donationTotal,
      totalAllowance,
      subtotalBeforeDonation,
      details
    };
  }

  /**
   * คำนวณภาษีบุคคลธรรมดาวิธีที่ 1 (ขั้นบันได)
   */
  function calculateIndividualProgressiveTax(netIncome) {
    let totalTax = 0;
    const bracketResults = [];

    for (let i = 0; i < INDIVIDUAL_TAX_BRACKETS.length; i++) {
      const b = INDIVIDUAL_TAX_BRACKETS[i];
      let taxableInBracket = 0;
      let taxInBracket = 0;

      if (netIncome > b.min) {
        const bracketCap = b.max === Infinity ? Infinity : b.max - b.min;
        taxableInBracket = Math.min(netIncome - b.min, bracketCap);
        taxInBracket = taxableInBracket * b.rate;
        totalTax += taxInBracket;
      }

      bracketResults.push({
        label: b.label,
        ratePercent: (b.rate * 100) + '%',
        taxableAmount: taxableInBracket,
        taxAmount: taxInBracket,
        isActive: taxableInBracket > 0
      });
    }

    return {
      totalTax: Math.round(totalTax * 100) / 100,
      bracketResults
    };
  }

  /**
   * คำนวณภาษีบุคคลธรรมดาวิธีที่ 2 (วิธีเหมา 0.5% สำหรับ 40(2)-(8) >= 120,000)
   */
  function calculateIndividualFlatTax(incomes) {
    const inc2 = Number(incomes.inc_40_2) || 0;
    const inc3 = Number(incomes.inc_40_3) || 0;
    const inc4 = Number(incomes.inc_40_4) || 0;
    const inc5 = (Number(incomes.inc_40_5_building) || 0) +
      (Number(incomes.inc_40_5_agri) || 0) +
      (Number(incomes.inc_40_5_other_land) || 0) +
      (Number(incomes.inc_40_5_vehicle) || 0) +
      (Number(incomes.inc_40_5_other) || 0);
    const inc6 = (Number(incomes.inc_40_6_medical) || 0) + (Number(incomes.inc_40_6_other) || 0);
    const inc7 = Number(incomes.inc_40_7) || 0;
    const inc8 = Number(incomes.inc_40_8) || 0;

    const nonSalaryIncome = inc2 + inc3 + inc4 + inc5 + inc6 + inc7 + inc8;
    let flatTax = 0;
    let isApplicable = false;

    if (nonSalaryIncome >= 120000) {
      const calculated = nonSalaryIncome * 0.005;
      if (calculated > 5000) {
        flatTax = calculated;
        isApplicable = true;
      }
    }

    return {
      nonSalaryIncome,
      flatTax: Math.round(flatTax * 100) / 100,
      isApplicable
    };
  }

  /**
   * ฟังก์ชันคำนวณรวมสำหรับบุคคลธรรมดา
   */
  function calculateIndividual(incomes = {}, allowances = {}) {
    const inc1 = Number(incomes.inc_40_1) || 0;
    const inc2 = Number(incomes.inc_40_2) || 0;
    const inc3 = Number(incomes.inc_40_3) || 0;
    const inc4 = Number(incomes.inc_40_4) || 0;
    const inc5 = (Number(incomes.inc_40_5_building) || 0) +
      (Number(incomes.inc_40_5_agri) || 0) +
      (Number(incomes.inc_40_5_other_land) || 0) +
      (Number(incomes.inc_40_5_vehicle) || 0) +
      (Number(incomes.inc_40_5_other) || 0);
    const inc6 = (Number(incomes.inc_40_6_medical) || 0) + (Number(incomes.inc_40_6_other) || 0);
    const inc7 = Number(incomes.inc_40_7) || 0;
    const inc8 = Number(incomes.inc_40_8) || 0;

    const totalIncome = inc1 + inc2 + inc3 + inc4 + inc5 + inc6 + inc7 + inc8;
    const withholdingTax = Math.max(0, Number(incomes.withholding_tax) || 0);

    // หักค่าใช้จ่ายอัตโนมัติตามกฎหมาย 100%
    const expenses = calculateIndividualAutoExpenses(incomes);
    const totalExpense = expenses.totalExpense;

    // เงินได้หลังหักค่าใช้จ่าย
    const netAfterExpense = Math.max(0, totalIncome - totalExpense);

    // หักค่าลดหย่อน
    const allowancesRes = calculateIndividualAllowances(allowances, totalIncome, netAfterExpense);
    const totalAllowance = allowancesRes.totalAllowance;

    // เงินได้สุทธิ
    const netTaxableIncome = Math.max(0, netAfterExpense - totalAllowance);

    // วิธีที่ 1: ขั้นบันได
    const progressive = calculateIndividualProgressiveTax(netTaxableIncome);

    // วิธีที่ 2: เหมา 0.5%
    const flat = calculateIndividualFlatTax(incomes);

    // เปรียบเทียบ
    let selectedMethod = 'method1';
    let taxPayableBeforeWht = progressive.totalTax;

    if (flat.isApplicable && flat.flatTax > progressive.totalTax) {
      selectedMethod = 'method2';
      taxPayableBeforeWht = flat.flatTax;
    }

    const diff = taxPayableBeforeWht - withholdingTax;
    let taxResultType = 'zero';
    let finalAmount = 0;

    if (diff > 0) {
      taxResultType = 'pay_more';
      finalAmount = diff;
    } else if (diff < 0) {
      taxResultType = 'refund';
      finalAmount = Math.abs(diff);
    }

    const effectiveTaxRate = totalIncome > 0 ? ((taxPayableBeforeWht / totalIncome) * 100) : 0;

    return {
      taxpayerType: 'individual',
      totalIncome,
      totalExpense,
      netAfterExpense,
      totalAllowance,
      netTaxableIncome,
      withholdingTax,
      progressive,
      flat,
      selectedMethod,
      taxPayableBeforeWht,
      taxResultType,
      finalAmount: Math.round(finalAmount * 100) / 100,
      effectiveTaxRate: Math.round(effectiveTaxRate * 100) / 100,
      expensesBreakdown: expenses,
      allowancesBreakdown: allowancesRes
    };
  }

  // =========================================================================
  // 2. ส่วนของนิติบุคคล (CORPORATE TAX - ภ.ง.ด. 50/51)
  // =========================================================================

  /**
   * คำนวณภาษีเงินได้นิติบุคคล (Corporate Income Tax - ภ.ง.ด. 50/51)
   * รองรับ Tax Adjustment (บวกกลับรายจ่ายต้องห้าม ม.65 ตรี / หักรายได้ยกเว้น ม.65 ทวิ)
   * รองรับทั้งเกณฑ์ SME (ทุน <= 5M & รายได้ขาย <= 30M) และ นิติบุคคลทั่วไป 20%
   */
  function calculateCorporate(revenueData = {}, expenseData = {}, criteriaData = {}) {
    const salesRevenue = Math.max(0, Number(revenueData.sales_revenue) || 0);
    const otherRevenue = Math.max(0, Number(revenueData.other_revenue) || 0);
    const totalRevenue = salesRevenue + otherRevenue;

    const withholdingTaxPaid = Math.max(0, Number(revenueData.withholding_tax_paid) || 0);
    const interimTaxPaid = Math.max(0, Number(revenueData.interim_tax_paid) || 0); // ภ.ง.ด.51 ครึ่งปี

    // รายจ่ายทางบัญชีของกิจการ
    const cogs = Math.max(0, Number(expenseData.cogs) || 0);
    const operatingExpenses = Math.max(0, Number(expenseData.operating_expenses) || 0);
    const depMachinery = Math.max(0, Number(expenseData.depreciation_machinery) || 0);
    const depComputer = Math.max(0, Number(expenseData.depreciation_computer) || 0);
    const depOther = Math.max(0, Number(expenseData.depreciation) || 0);
    const depreciation = depMachinery + depComputer + depOther;

    const totalAccountingExpenses = cogs + operatingExpenses + depreciation;

    // 1. กำไร(ขาดทุน)สุทธิทางบัญชี (Accounting Net Profit)
    const accountingNetProfit = totalRevenue - totalAccountingExpenses;

    // 2. ปรับปรุงกำไรสุทธิทางภาษีอากร (Tax Adjustments ตามประมวลรัษฎากร)
    // - บวกกลับ: รายจ่ายต้องห้ามตามมาตรา 65 ตรี (เช่น ค่ารับรองส่วนเกิน เบี้ยปรับ รายจ่ายส่วนตัว)
    const taxAddbackExpenses = Math.max(0, Number(expenseData.tax_addback_expenses) || 0);
    // - หักออก: รายได้ที่ได้รับยกเว้นภาษีตามมาตรา 65 ทวิ (เช่น เงินปันผลยกเว้น)
    const taxExemptIncomes = Math.max(0, Number(expenseData.tax_exempt_incomes) || 0);
    // - หักออกเพิ่ม: รายจ่ายสิทธิประโยชน์พิเศษ (เช่น วิจัย R&D / ฝึกอบรม 200%)
    const specialDeductions = Math.max(0, Number(expenseData.special_deductions) || 0);

    // กำไรสุทธิก่อนหักเงินบริจาคทางภาษี
    const netProfitBeforeDonation = Math.max(
      0,
      accountingNetProfit + taxAddbackExpenses - taxExemptIncomes - specialDeductions
    );

    let donationAllowed = 0;
    let netTaxableProfit = 0;

    if (netProfitBeforeDonation > 0) {
      // เพดานเงินบริจาคของนิติบุคคล: ไม่เกิน 2% ของกำไรสุทธิเพื่อการศึกษา/กีฬา และ 2% เพื่อสาธารณกุศล
      const donationEdu = Math.max(0, Number(criteriaData.donation_education) || 0);
      const donationPublic = Math.max(0, Number(criteriaData.donation_public) || 0);

      const capEdu = netProfitBeforeDonation * 0.02;
      const allowedEdu = Math.min(donationEdu, capEdu);

      const capPublic = (netProfitBeforeDonation - allowedEdu) * 0.02;
      const allowedPublic = Math.min(donationPublic, capPublic);

      donationAllowed = allowedEdu + allowedPublic;
      netTaxableProfit = Math.max(0, netProfitBeforeDonation - donationAllowed);
    } else {
      netTaxableProfit = 0;
    }

    // ตรวจสอบเงื่อนไข SME อัตโนมัติ:
    // 1. ทุนจดทะเบียนที่ชำระแล้วในวันสุดท้ายของรอบบัญชี ไม่เกิน 5 ล้านบาท
    // 2. รายได้จากการขายสินค้าและให้บริการในรอบบัญชี ไม่เกิน 30 ล้านบาท
    const paidUpCapital = Math.max(0, Number(criteriaData.paid_up_capital) || 0);
    const isPaidUpCapitalLe5M = paidUpCapital > 0
      ? paidUpCapital <= 5000000
      : Boolean(criteriaData.paid_up_capital_le_5m);
    const isSalesLe30M = salesRevenue <= 30000000;
    const isSME = isPaidUpCapitalLe5M && isSalesLe30M;

    let totalCorporateTax = 0;
    const bracketResults = [];

    if (netTaxableProfit > 0) {
      if (isSME) {
        // อัตราภาษี SME แบบขั้นบันได
        let remaining = netTaxableProfit;

        // ขั้นที่ 1: 0 - 300,000 บาท (ยกเว้น 0%)
        const t1 = Math.min(remaining, 300000);
        bracketResults.push({
          label: '0 - 300,000 บาท (ยกเว้นภาษี)',
          ratePercent: '0%',
          taxableAmount: t1,
          taxAmount: 0,
          isActive: t1 > 0
        });

        // ขั้นที่ 2: 300,001 - 3,000,000 บาท (15%)
        if (remaining > 300000) {
          const t2 = Math.min(remaining - 300000, 2700000);
          const tax2 = t2 * 0.15;
          totalCorporateTax += tax2;
          bracketResults.push({
            label: '300,001 - 3,000,000 บาท',
            ratePercent: '15%',
            taxableAmount: t2,
            taxAmount: tax2,
            isActive: true
          });
        } else {
          bracketResults.push({
            label: '300,001 - 3,000,000 บาท',
            ratePercent: '15%',
            taxableAmount: 0,
            taxAmount: 0,
            isActive: false
          });
        }

        // ขั้นที่ 3: เกิน 3,000,000 บาท (20%)
        if (remaining > 3000000) {
          const t3 = remaining - 3000000;
          const tax3 = t3 * 0.20;
          totalCorporateTax += tax3;
          bracketResults.push({
            label: 'ส่วนที่เกิน 3,000,000 บาท',
            ratePercent: '20%',
            taxableAmount: t3,
            taxAmount: tax3,
            isActive: true
          });
        } else {
          bracketResults.push({
            label: 'ส่วนที่เกิน 3,000,000 บาท',
            ratePercent: '20%',
            taxableAmount: 0,
            taxAmount: 0,
            isActive: false
          });
        }
      } else {
        // นิติบุคคลทั่วไป: 20% คงที่
        totalCorporateTax = netTaxableProfit * 0.20;
        bracketResults.push({
          label: 'กำไรสุทธิทั้งหมด (อัตราคงที่นิติบุคคลทั่วไป 20%)',
          ratePercent: '20%',
          taxableAmount: netTaxableProfit,
          taxAmount: totalCorporateTax,
          isActive: true
        });
      }
    }

    totalCorporateTax = Math.round(totalCorporateTax * 100) / 100;

    // คำนวณส่วนต่างภาษีที่ประหยัดได้จากการได้รับสิทธิ SME
    const standardTaxWithoutSme = Math.round((netTaxableProfit * 0.20) * 100) / 100;
    const smeTaxSavings = isSME ? Math.max(0, standardTaxWithoutSme - totalCorporateTax) : 0;

    // หักเครดิตภาษี: ภาษีหัก ณ ที่จ่าย + ภาษีครึ่งปี (ภ.ง.ด. 51)
    const totalTaxCredits = withholdingTaxPaid + interimTaxPaid;
    const diff = totalCorporateTax - totalTaxCredits;

    let taxResultType = 'zero';
    let finalAmount = 0;

    if (diff > 0) {
      taxResultType = 'pay_more';
      finalAmount = diff;
    } else if (diff < 0) {
      taxResultType = 'refund';
      finalAmount = Math.abs(diff);
    }

    const effectiveTaxRate = totalRevenue > 0 ? ((totalCorporateTax / totalRevenue) * 100) : 0;

    return {
      taxpayerType: 'corporate',
      totalRevenue,
      salesRevenue,
      otherRevenue,
      totalExpenses: totalAccountingExpenses + specialDeductions,
      cogs,
      operatingExpenses,
      depreciation,
      depreciationMachinery: depMachinery,
      depreciationComputer: depComputer,
      paidUpCapital,
      specialDeductions,
      taxAddbackExpenses,
      taxExemptIncomes,
      accountingNetProfit,
      netProfitBeforeDonation,
      donationAllowed,
      netTaxableProfit,
      isSME,
      isPaidUpCapitalLe5M,
      isSalesLe30M,
      corporateTaxRateLabel: isSME ? 'อัตรา SME ขั้นบันได (0%, 15%, 20%)' : 'อัตราทั่วไป (20%)',
      totalCorporateTax,
      standardTaxWithoutSme,
      smeTaxSavings,
      bracketResults,
      withholdingTaxPaid,
      interimTaxPaid,
      totalTaxCredits,
      taxResultType,
      finalAmount: Math.round(finalAmount * 100) / 100,
      effectiveTaxRate: Math.round(effectiveTaxRate * 100) / 100
    };
  }

  // =========================================================================
  // 3. ระบบแนะนำแผนประหยัดภาษี & SIMULATOR (TAX OPTIMIZATION)
  // =========================================================================

  /**
   * ระบบแนะนำแผนประหยัดภาษีอัจฉริยะ (Smart Tax Saver Suggestions)
   * ประเมินสิทธิลดหย่อนที่ยังซื้อเพิ่มได้ (Thai ESG, RMF, SSF, ประกัน)
   * คำนวณภาษีที่ประหยัดได้ตามฐานภาษีสูงสุด (Marginal Tax Bracket)
   */
  function getSmartTaxSavingsSuggestions(incomes = {}, allowances = {}, individualResult = null) {
    if (!individualResult) {
      individualResult = calculateIndividual(incomes, allowances);
    }
    if (individualResult.taxpayerType !== 'individual') return null;

    const totalIncome = individualResult.totalIncome;
    const currentNetIncome = individualResult.netTaxableIncome;
    const currentTax = individualResult.taxPayableBeforeWht;

    // หา Marginal Tax Rate (อัตราภาษีฐานสูงสุดปัจจุบัน)
    let marginalRate = 0;
    for (let i = 0; i < INDIVIDUAL_TAX_BRACKETS.length; i++) {
      const b = INDIVIDUAL_TAX_BRACKETS[i];
      if (currentNetIncome > b.min) {
        marginalRate = b.rate;
      }
    }

    // 1. Thai ESG: เพดาน 30% สูงสุด 300,000 บ. (แยกต่างหากจากเกษียณ)
    const thaiEsgMaxLimit = Math.min(totalIncome * 0.30, 300000);
    const thaiEsgCurrent = Math.max(0, Number(allowances.thai_esg) || 0);
    const thaiEsgRemaining = Math.max(0, thaiEsgMaxLimit - thaiEsgCurrent);

    // 2. กลุ่มเกษียณอายุ (Pool Cap 500,000 บ.)
    const pvd = Math.min(Math.max(0, Number(allowances.provident_fund) || 0), totalIncome * 0.15, 500000);
    const nsf = Math.min(Math.max(0, Number(allowances.nsf) || 0), 30000);
    const pension = Math.min(Math.max(0, Number(allowances.pension_insurance) || 0), totalIncome * 0.15, 200000);
    const rmfCurrent = Math.max(0, Number(allowances.rmf) || 0);
    const ssfCurrent = Math.max(0, Number(allowances.ssf) || 0);
    const currentPoolUsed = pvd + nsf + pension + rmfCurrent + ssfCurrent;
    const poolRemaining = Math.max(0, 500000 - currentPoolUsed);

    // RMF: 30% ไม่เกิน 500,000
    const rmfIndividualLimit = Math.min(totalIncome * 0.30, 500000);
    const rmfRemainingByRule = Math.max(0, rmfIndividualLimit - rmfCurrent);
    const rmfRemaining = Math.min(rmfRemainingByRule, poolRemaining);

    // SSF: 30% ไม่เกิน 200,000
    const ssfIndividualLimit = Math.min(totalIncome * 0.30, 200000);
    const ssfRemainingByRule = Math.max(0, ssfIndividualLimit - ssfCurrent);
    const ssfRemaining = Math.min(ssfRemainingByRule, poolRemaining);

    // 3. เบี้ยประกันชีวิตและสุขภาพ (รวมไม่เกิน 100,000, สุขภาพไม่เกิน 25,000)
    const lifeCurrent = Math.max(0, Number(allowances.life_insurance) || 0);
    const healthCurrent = Math.min(Math.max(0, Number(allowances.health_insurance) || 0), 25000);
    const insuranceCombined = Math.min(lifeCurrent + healthCurrent, 100000);
    const insuranceRemaining = Math.max(0, 100000 - insuranceCombined);

    // 4. ดอกเบี้ยกู้บ้าน (ไม่เกิน 100,000)
    const homeLoanCurrent = Math.max(0, Number(allowances.home_loan_interest) || 0);
    const homeLoanRemaining = Math.max(0, 100000 - homeLoanCurrent);

    // ฟังก์ชันคำนวณภาษีที่ประหยัดได้จริงเมื่อเพิ่มค่าลดหย่อน
    function calcSavings(key, addAmount) {
      if (addAmount <= 0) return { taxSaved: 0, newTax: currentTax, roi: 0 };
      const simulatedAllowances = Object.assign({}, allowances);
      simulatedAllowances[key] = (Number(allowances[key]) || 0) + addAmount;
      const simRes = calculateIndividual(incomes, simulatedAllowances);
      const taxSaved = Math.max(0, currentTax - simRes.taxPayableBeforeWht);
      const roi = (taxSaved / addAmount) * 100;
      return {
        taxSaved: Math.round(taxSaved * 100) / 100,
        newTax: simRes.taxPayableBeforeWht,
        roi: Math.round(roi * 10) / 10
      };
    }

    const thaiEsgSavings = calcSavings('thai_esg', thaiEsgRemaining);
    const rmfSavings = calcSavings('rmf', rmfRemaining);
    const ssfSavings = calcSavings('ssf', ssfRemaining);
    const insuranceSavings = calcSavings('life_insurance', insuranceRemaining);
    const homeLoanSavings = calcSavings('home_loan_interest', homeLoanRemaining);

    // จำลองกรณีซื้อเพิ่มครบทุกสิทธิสูงสุด
    const allMaxAllowances = Object.assign({}, allowances, {
      thai_esg: (Number(allowances.thai_esg) || 0) + thaiEsgRemaining,
      rmf: (Number(allowances.rmf) || 0) + rmfRemaining,
      life_insurance: (Number(allowances.life_insurance) || 0) + insuranceRemaining
    });
    const totalMaxRes = calculateIndividual(incomes, allMaxAllowances);
    const totalMaxSaved = Math.max(0, currentTax - totalMaxRes.taxPayableBeforeWht);
    const totalAddInvested = thaiEsgRemaining + rmfRemaining + insuranceRemaining;
    const totalMaxRoi = totalAddInvested > 0 ? (totalMaxSaved / totalAddInvested) * 100 : 0;

    return {
      marginalRatePercent: (marginalRate * 100) + '%',
      marginalRate,
      currentTax,
      items: [
        {
          id: 'thai_esg',
          name: 'กองทุน Thai ESG (เพื่อความยั่งยืน)',
          badge: 'สิทธิพิเศษแยก 300k',
          limit: thaiEsgMaxLimit,
          current: thaiEsgCurrent,
          remaining: thaiEsgRemaining,
          taxSaved: thaiEsgSavings.taxSaved,
          roi: thaiEsgSavings.roi,
          description: 'วงเงินแยกพิเศษ 30% สูงสุด 300,000 บ. ไม่รวมกับเพดาน 5 แสน'
        },
        {
          id: 'rmf',
          name: 'กองทุน RMF (เพื่อการเลี้ยงชีพ)',
          badge: 'กลุ่มเกษียณ 500k',
          limit: rmfIndividualLimit,
          current: rmfCurrent,
          remaining: rmfRemaining,
          taxSaved: rmfSavings.taxSaved,
          roi: rmfSavings.roi,
          description: 'สูงสุด 30% ไม่เกิน 500,000 บ. (อยู่ในเพดานเกษียณรวม 5 แสน)'
        },
        {
          id: 'ssf',
          name: 'กองทุน SSF (เพื่อการออมระยะยาว)',
          badge: 'กลุ่มเกษียณ 200k',
          limit: ssfIndividualLimit,
          current: ssfCurrent,
          remaining: ssfRemaining,
          taxSaved: ssfSavings.taxSaved,
          roi: ssfSavings.roi,
          description: 'สูงสุด 30% ไม่เกิน 200,000 บ. (อยู่ในเพดานเกษียณรวม 5 แสน)'
        },
        {
          id: 'insurance',
          name: 'ประกันชีวิตและสุขภาพ',
          badge: 'คุ้มครองชีวิต 100k',
          limit: 100000,
          current: insuranceCombined,
          remaining: insuranceRemaining,
          taxSaved: insuranceSavings.taxSaved,
          roi: insuranceSavings.roi,
          description: 'เบี้ยประกันชีวิตทั่วไป + สุขภาพ รวมไม่เกิน 100,000 บาท'
        },
        {
          id: 'home_loan',
          name: 'ดอกเบี้ยเงินกู้ยืมเพื่อที่อยู่อาศัย',
          badge: 'อสังหาฯ 100k',
          limit: 100000,
          current: homeLoanCurrent,
          remaining: homeLoanRemaining,
          taxSaved: homeLoanSavings.taxSaved,
          roi: homeLoanSavings.roi,
          description: 'ดอกเบี้ยเงินกู้ซื้อบ้าน/คอนโด ตามจริงไม่เกิน 100,000 บาท'
        }
      ],
      totalMaxPotential: {
        totalAddInvested,
        totalMaxSaved,
        totalMaxRoi: Math.round(totalMaxRoi * 10) / 10,
        newTax: totalMaxRes.taxPayableBeforeWht
      }
    };
  }

  /**
   * จำลองเปรียบเทียบ Before vs. After (Interactive Simulator)
   */
  function simulateTaxSavings(incomes = {}, allowances = {}, targetCategory = 'auto_smart', addAmount = 0) {
    const amount = Math.max(0, Number(addAmount) || 0);
    const beforeResult = calculateIndividual(incomes, allowances);

    const afterAllowances = Object.assign({}, allowances);
    if (targetCategory === 'auto_smart') {
      // กระจายเข้า Thai ESG ก่อน แล้วตามด้วย RMF แล้วตามด้วยประกันชีวิต
      const suggestions = getSmartTaxSavingsSuggestions(incomes, allowances, beforeResult);
      let left = amount;
      if (suggestions) {
        const esgRem = suggestions.items.find(i => i.id === 'thai_esg')?.remaining || 0;
        const putEsg = Math.min(left, esgRem);
        afterAllowances.thai_esg = (Number(afterAllowances.thai_esg) || 0) + putEsg;
        left -= putEsg;

        if (left > 0) {
          const rmfRem = suggestions.items.find(i => i.id === 'rmf')?.remaining || 0;
          const putRmf = Math.min(left, rmfRem);
          afterAllowances.rmf = (Number(afterAllowances.rmf) || 0) + putRmf;
          left -= putRmf;
        }

        if (left > 0) {
          const insRem = suggestions.items.find(i => i.id === 'insurance')?.remaining || 0;
          const putIns = Math.min(left, insRem);
          afterAllowances.life_insurance = (Number(afterAllowances.life_insurance) || 0) + putIns;
          left -= putIns;
        }
      }
    } else {
      afterAllowances[targetCategory] = (Number(afterAllowances[targetCategory]) || 0) + amount;
    }

    const afterResult = calculateIndividual(incomes, afterAllowances);
    const taxSaved = Math.max(0, beforeResult.taxPayableBeforeWht - afterResult.taxPayableBeforeWht);
    const roi = amount > 0 ? (taxSaved / amount) * 100 : 0;

    return {
      addAmount: amount,
      targetCategory,
      before: {
        totalAllowance: beforeResult.totalAllowance,
        netTaxableIncome: beforeResult.netTaxableIncome,
        taxPayable: beforeResult.taxPayableBeforeWht,
        finalAmount: beforeResult.finalAmount,
        taxResultType: beforeResult.taxResultType,
        effectiveRate: beforeResult.effectiveTaxRate
      },
      after: {
        totalAllowance: afterResult.totalAllowance,
        netTaxableIncome: afterResult.netTaxableIncome,
        taxPayable: afterResult.taxPayableBeforeWht,
        finalAmount: afterResult.finalAmount,
        taxResultType: afterResult.taxResultType,
        effectiveRate: afterResult.effectiveTaxRate
      },
      taxSaved: Math.round(taxSaved * 100) / 100,
      roiPercent: Math.round(roi * 10) / 10
    };
  }

  return {
    INDIVIDUAL_TAX_BRACKETS,
    CORPORATE_SME_BRACKETS,
    calculateIndividual,
    calculateIndividualAutoExpenses,
    calculateIndividualAllowances,
    calculateCorporate,
    getSmartTaxSavingsSuggestions,
    simulateTaxSavings
  };
})();

// Export for module or browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TaxEngine;
}
