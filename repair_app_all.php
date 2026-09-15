<?php
// repair_app_all.php - Cleanly repair all corrupted strings in js/app.js

$file = 'js/app.js';
$lines = explode("\n", file_get_contents($file));

for ($i = 0; $i < count($lines); $i++) {
    $line = $lines[$i];
    $trimmed = trim($line);

    // Skip clean lines without ??
    if (strpos($line, '??') === false) {
        continue;
    }

    // Line 2-4: Header docblock
    if ($i >= 1 && $i <= 4) {
        if ($i == 1) $lines[$i] = " * js/app.js - ระบบบริหารจัดการภาษีเงินได้บุคคลธรรมดาและนิติบุคคล TAX PORTAL";
        if ($i == 2) $lines[$i] = " * รองรับการคำนวณภาษี \"บุคคลธรรมดา\" และ \"นิติบุคคล\", ระบบหักค่าใช้จ่ายเหมาอัตโนมัติ 100%,";
        if ($i == 3) $lines[$i] = " * จัดการขั้นตอนวิซาร์ด 3 ขั้นตอนกระชับ, แดชบอร์ดจัดการระบบสำหรับผู้ดูแล, และระบบติดต่อแอดมิน";
        continue;
    }

    // Toast icons
    if (strpos($line, "let icon = '") !== false) {
        $lines[$i] = "    let icon = 'ℹ️';";
        continue;
    }
    if (strpos($line, "if (type === 'success') icon = '") !== false) {
        $lines[$i] = "    if (type === 'success') icon = '✅';";
        continue;
    }
    if (strpos($line, "if (type === 'error') icon = '") !== false) {
        $lines[$i] = "    if (type === 'error') icon = '❌';";
        continue;
    }

    // Taxpayer type switching comments
    if (strpos($line, "Taxpayer Type Switching") !== false) {
        $lines[$i] = "  // 1. สลับประเภทผู้เสียภาษี (Taxpayer Type Switching)";
        continue;
    }

    // Individual Badges & Steps
    if (strpos($line, "badge.textContent = '") !== false && strpos($line, "90/91") !== false) {
        $lines[$i] = "      if (badge) badge.textContent = 'บุคคลธรรมดา (ภ.ง.ด. 90/91)';";
        continue;
    }
    if (strpos($line, "sideBadge.textContent = '") !== false && $i < 130) {
        $lines[$i] = "      if (sideBadge) sideBadge.textContent = 'บุคคลธรรมดา';";
        continue;
    }
    if (strpos($line, "headerBadge.textContent = '") !== false && strpos($line, "90/91") !== false) {
        $lines[$i] = "      if (headerBadge) headerBadge.textContent = 'ภ.ง.ด. 90/91';";
        continue;
    }
    if (strpos($line, "nav-title-step1") !== false && $i < 130) {
        $lines[$i] = "      document.getElementById('nav-title-step1').textContent = 'เงินได้พึงประเมิน';";
        continue;
    }
    if (strpos($line, "nav-sub-step1") !== false && $i < 130) {
        $lines[$i] = "      document.getElementById('nav-sub-step1').textContent = 'หักค่าใช้จ่ายอัตโนมัติ';";
        continue;
    }
    if (strpos($line, "nav-title-step2") !== false && $i < 130) {
        $lines[$i] = "      document.getElementById('nav-title-step2').textContent = 'ค่าลดหย่อนภาษี';";
        continue;
    }
    if (strpos($line, "nav-sub-step2") !== false && strpos($line, "Thai ESG") !== false) {
        $lines[$i] = "      document.getElementById('nav-sub-step2').textContent = '4 กลุ่มลดหย่อน & Thai ESG';";
        continue;
    }
    if (strpos($line, "nav-title-step3") !== false && $i < 130) {
        $lines[$i] = "      document.getElementById('nav-title-step3').textContent = 'สรุปผลภาษีฉบับสมบูรณ์';";
        continue;
    }
    if (strpos($line, "nav-sub-step3") !== false && $i < 130) {
        $lines[$i] = "      document.getElementById('nav-sub-step3').textContent = 'เห็นผลสรุปทันที';";
        continue;
    }

    // Individual Sidebar & Summary Labels
    if (strpos($line, "side-lbl-income") !== false && $i < 130) {
        $lines[$i] = "      document.getElementById('side-lbl-income').textContent = 'เงินได้พึงประเมิน:';";
        continue;
    }
    if (strpos($line, "side-lbl-expense") !== false && $i < 130) {
        $lines[$i] = "      document.getElementById('side-lbl-expense').textContent = 'ค่าใช้จ่าย (หักเหมาอัตโนมัติ):';";
        continue;
    }
    if (strpos($line, "side-lbl-allowance") !== false && $i < 130) {
        $lines[$i] = "      document.getElementById('side-lbl-allowance').textContent = 'ค่าลดหย่อนภาษี:';";
        continue;
    }
    if (strpos($line, "side-lbl-net") !== false && strpos($line, "Net Income") !== false) {
        $lines[$i] = "      document.getElementById('side-lbl-net').textContent = 'เงินได้สุทธิ (Net Income)';";
        continue;
    }
    if (strpos($line, "lbl-sum-col1") !== false && $i < 140) {
        $lines[$i] = "      document.getElementById('lbl-sum-col1').textContent = '1. รวมเงินได้พึงประเมิน';";
        continue;
    }
    if (strpos($line, "lbl-sum-col2") !== false && $i < 140) {
        $lines[$i] = "      document.getElementById('lbl-sum-col2').textContent = '2. หักค่าใช้จ่ายเหมา (อัตโนมัติ)';";
        continue;
    }
    if (strpos($line, "lbl-sum-col3") !== false && $i < 140) {
        $lines[$i] = "      document.getElementById('lbl-sum-col3').textContent = '3. หักค่าลดหย่อนรวม';";
        continue;
    }
    if (strpos($line, "lbl-sum-col4") !== false && $i < 140) {
        $lines[$i] = "      document.getElementById('lbl-sum-col4').textContent = '4. เงินได้สุทธิ (Net Taxable)';";
        continue;
    }
    if (strpos($line, "th-bracket-range") !== false && $i < 140) {
        $lines[$i] = "      document.getElementById('th-bracket-range').textContent = 'ขั้นเงินได้สุทธิ';";
        continue;
    }
    if (strpos($line, "bracket-table-title") !== false && $i < 140) {
        $lines[$i] = "      document.getElementById('bracket-table-title').textContent = 'ตารางคำนวณภาษีวิธีที่ 1 (อัตราก้าวหน้าบุคคลธรรมดา)';";
        continue;
    }
    if (strpos($line, "bracket-table-desc") !== false && $i < 140) {
        $lines[$i] = "      document.getElementById('bracket-table-desc').textContent = 'อัตราภาษี 0% - 35% ตามเกณฑ์ประมวลรัษฎากร';";
        continue;
    }

    // Corporate Badges & Steps
    if (strpos($line, "badge.textContent = '") !== false && strpos($line, "50/51") !== false) {
        $lines[$i] = "      if (badge) badge.textContent = 'นิติบุคคล (ภ.ง.ด. 50/51)';";
        continue;
    }
    if (strpos($line, "sideBadge.textContent = '") !== false && $i > 130 && $i < 160) {
        $lines[$i] = "      if (sideBadge) sideBadge.textContent = 'นิติบุคคล';";
        continue;
    }
    if (strpos($line, "headerBadge.textContent = '") !== false && strpos($line, "50/51") !== false) {
        $lines[$i] = "      if (headerBadge) headerBadge.textContent = 'ภ.ง.ด. 50/51';";
        continue;
    }
    if (strpos($line, "nav-title-step1") !== false && $i > 130 && $i < 165) {
        $lines[$i] = "      document.getElementById('nav-title-step1').textContent = 'รายได้และกำไรทางบัญชี';";
        continue;
    }
    if (strpos($line, "nav-sub-step1") !== false && $i > 130 && $i < 165) {
        $lines[$i] = "      document.getElementById('nav-sub-step1').textContent = 'ยอดขาย รายได้ และต้นทุน';";
        continue;
    }
    if (strpos($line, "nav-title-step2") !== false && strpos($line, "SME") !== false) {
        $lines[$i] = "      document.getElementById('nav-title-step2').textContent = 'สิทธิประโยชน์ SME & หัก ณ ที่จ่าย';";
        continue;
    }
    if (strpos($line, "nav-sub-step2") !== false && $i > 130 && $i < 165) {
        $lines[$i] = "      document.getElementById('nav-sub-step2').textContent = 'เงื่อนไข SME และเครดิตภาษี';";
        continue;
    }
    if (strpos($line, "nav-title-step3") !== false && $i > 130 && $i < 165) {
        $lines[$i] = "      document.getElementById('nav-title-step3').textContent = 'สรุปผลภาษีเงินได้นิติบุคคล';";
        continue;
    }
    if (strpos($line, "nav-sub-step3") !== false && $i > 130 && $i < 165) {
        $lines[$i] = "      document.getElementById('nav-sub-step3').textContent = 'กำไรสุทธิ & ภาษีที่ต้องชำระ';";
        continue;
    }

    // Corporate Sidebar & Summary Labels
    if (strpos($line, "side-lbl-income") !== false && $i > 130 && $i < 175) {
        $lines[$i] = "      document.getElementById('side-lbl-income').textContent = 'รายได้รวมทางภาษี:';";
        continue;
    }
    if (strpos($line, "side-lbl-expense") !== false && $i > 130 && $i < 175) {
        $lines[$i] = "      document.getElementById('side-lbl-expense').textContent = 'รายจ่ายที่หักได้ตามกฎหมาย:';";
        continue;
    }
    if (strpos($line, "side-lbl-allowance") !== false && $i > 130 && $i < 175) {
        $lines[$i] = "      document.getElementById('side-lbl-allowance').textContent = 'รายจ่ายพิเศษและลดหย่อน:';";
        continue;
    }
    if (strpos($line, "side-lbl-net") !== false && strpos($line, "Net Profit") !== false) {
        $lines[$i] = "      document.getElementById('side-lbl-net').textContent = 'กำไรสุทธิทางภาษี (Net Profit)';";
        continue;
    }
    if (strpos($line, "lbl-sum-col1") !== false && $i > 150 && $i < 185) {
        $lines[$i] = "      document.getElementById('lbl-sum-col1').textContent = '1. รายได้รวมทางบัญชีภาษี';";
        continue;
    }
    if (strpos($line, "lbl-sum-col2") !== false && $i > 150 && $i < 185) {
        $lines[$i] = "      document.getElementById('lbl-sum-col2').textContent = '2. รายจ่ายและต้นทุนที่หักได้';";
        continue;
    }
    if (strpos($line, "lbl-sum-col3") !== false && $i > 150 && $i < 185) {
        $lines[$i] = "      document.getElementById('lbl-sum-col3').textContent = '3. รายจ่ายพิเศษ/ลดหย่อน (ยกเว้น 2 เท่า)';";
        continue;
    }
    if (strpos($line, "lbl-sum-col4") !== false && $i > 150 && $i < 185) {
        $lines[$i] = "      document.getElementById('lbl-sum-col4').textContent = '4. กำไรสุทธิเพื่อเสียภาษี';";
        continue;
    }
    if (strpos($line, "th-bracket-range") !== false && $i > 150 && $i < 185) {
        $lines[$i] = "      document.getElementById('th-bracket-range').textContent = 'ขั้นกำไรสุทธิทางภาษี';";
        continue;
    }
    if (strpos($line, "bracket-table-title") !== false && $i > 150 && $i < 185) {
        $lines[$i] = "      document.getElementById('bracket-table-title').textContent = 'ตารางคำนวณภาษีเงินได้นิติบุคคล';";
        continue;
    }
    if (strpos($line, "bracket-table-desc") !== false && $i > 150 && $i < 185) {
        $lines[$i] = "      document.getElementById('bracket-table-desc').textContent = 'คำนวณตามเกณฑ์อัตราภาษี SME หรืออัตราทั่วไป 20%';";
        continue;
    }

    // Section 2 & 3 comments
    if (strpos($line, "// 2.") !== false) {
        $lines[$i] = "  // 2. รวบรวมข้อมูลจากแบบฟอร์ม";
        continue;
    }
    if (strpos($line, "3 Steps Navigation") !== false) {
        $lines[$i] = "  // 3. สเต็ปการนำทาง (3 Steps Navigation & Strict Locking)";
        continue;
    }
    if (strpos($line, "showToast") !== false && strpos($line, "'error'") !== false && $i >= 300 && $i <= 335) {
        if (strpos($line, "1") !== false) {
            $lines[$i] = "        showToast('กรุณากรอกข้อมูลรายได้ในขั้นตอนที่ 1 ก่อนเข้าสู่ขั้นตอนถัดไป', 'error');";
        } else {
            $lines[$i] = "        showToast('กรุณาผ่านขั้นตอนก่อนหน้าให้เรียบร้อยก่อน', 'error');";
        }
        continue;
    }

    // Section 4 recalculate
    if (strpos($line, "// 4.") !== false) {
        $lines[$i] = "  // 4. คำนวณภาษีแบบเรียลไทม์ Real-time";
        continue;
    }
    if (strpos($line, "taxPayableBeforeWht") !== false && strpos($line, "withholdingTax") !== false) {
        $lines[$i] = "        `ภาษีที่ต้องชำระ \${formatMoney(res.taxPayableBeforeWht)} บาท หัก ณ ที่จ่าย \${formatMoney(res.withholdingTax)} บาท`,";
        continue;
    }
    if (strpos($line, "150000") !== false && strpos($line, "netTaxableIncome") !== false) {
        $lines[$i] = "        res.netTaxableIncome <= 150000 ? 'เงินได้สุทธิไม่เกิน 150,000 บาท ได้รับการยกเว้นภาษี' : 'คำนวณภาษีตามอัตราก้าวหน้า หัก ณ ที่จ่าย'";
        continue;
    }
    if (strpos($line, "salesStatus.textContent = '") !== false && strpos($line, "30") !== false) {
        if (strpos($line, "ไม่เกิน") !== false || strpos($line, "ผ่านเกณฑ์") !== false || strpos($line, "<=") !== false) {
            $lines[$i] = "          salesStatus.textContent = 'รายได้ผ่านเกณฑ์ (ไม่เกิน 30 ล้านบาท)';";
        } else {
            $lines[$i] = "          salesStatus.textContent = 'เกิน 30 ล้านบาท (ไม่เข้าเกณฑ์ SME)';";
        }
        continue;
    }
    if (strpos($line, "decisionBox.innerHTML") !== false && strpos($line, "SME") !== false) {
        if (strpos($line, "เข้าเกณฑ์") !== false || strpos($line, "15%") !== false) {
            $lines[$i] = "          decisionBox.innerHTML = '✅ <strong>เข้าเกณฑ์นิติบุคคล SME:</strong> ได้รับสิทธิอัตราภาษีก้าวหน้า (3 แสนแรก 0%, 3 แสน-3 ล้าน 15%, เกิน 3 ล้าน 20%)';";
        } else {
            $lines[$i] = "          decisionBox.innerHTML = '⚠️ <strong>ไม่เข้าเกณฑ์ SME:</strong> เสียภาษีในอัตราคงที่ 20% ของกำไรสุทธิทางภาษี';";
        }
        continue;
    }
    if (strpos($line, "totalCorporateTax") !== false && strpos($line, "totalTaxCredits") !== false) {
        $lines[$i] = "        `ภาษีเงินได้นิติบุคคล \${formatMoney(res.totalCorporateTax)} บาท เครดิตภาษีหัก ณ ที่จ่าย \${formatMoney(res.totalTaxCredits)} บาท`,";
        continue;
    }

    // Status amount texts
    if (strpos($line, "statusEl.textContent = '") !== false) {
        if ($i < 480) {
            if (strpos($line, "ชำระเพิ่ม") !== false || $i <= 446) {
                $lines[$i] = "      statusEl.textContent = 'ภาษีที่ต้องชำระเพิ่มเติม';";
            } elseif (strpos($line, "คืน") !== false || $i <= 452) {
                $lines[$i] = "      statusEl.textContent = 'ได้คืนภาษี (ชำระเกินไว้)';";
            } else {
                $lines[$i] = "      statusEl.textContent = 'ไม่มีภาษีที่ต้องชำระเพิ่ม';";
            }
        } elseif ($i < 540) {
            if ($i <= 520) {
                $lines[$i] = "      statusEl.textContent = 'ภาษีที่ต้องชำระเพิ่มเติม';";
            } elseif ($i <= 528) {
                $lines[$i] = "      statusEl.textContent = 'ได้คืนภาษี (ชำระเกินไว้)';";
            } else {
                $lines[$i] = "      statusEl.textContent = 'ไม่มีภาษีที่ต้องชำระเพิ่ม';";
            }
        } elseif ($i < 600) {
            if ($i <= 578) {
                $lines[$i] = "      statusEl.textContent = 'ภาษีเงินได้นิติบุคคลที่ต้องชำระเพิ่มเติม';";
            } elseif ($i <= 585) {
                $lines[$i] = "      statusEl.textContent = 'ได้คืนภาษี (ชำระไว้เกินกว่าภาษีที่ต้องเสีย)';";
            } else {
                $lines[$i] = "      statusEl.textContent = 'ยอดภาษีพอดี: ไม่มีภาษีที่ต้องชำระเพิ่ม';";
            }
        }
        continue;
    }

    if (strpos($line, "amountEl.textContent = ") !== false) {
        if (strpos($line, "0") !== false) {
            $lines[$i] = "      amountEl.textContent = '0 บาท';";
        } else {
            $lines[$i] = "      amountEl.textContent = formatMoney(amount) + ' บาท';";
        }
        continue;
    }

    // 40(1) - 40(8) breakdown array
    if (strpos($line, "40(1)") !== false) {
        $lines[$i] = "      { name: '40(1) เงินเดือนประจำ + 40(2) ค่าจ้างทั่วไป', rule: 'หักค่าใช้จ่ายเหมา 50% สูงสุดไม่เกิน 100,000 บาท', inc: (Number(document.getElementById('inc_40_1')?.value) || 0) + (Number(document.getElementById('inc_40_2')?.value) || 0), exp: b.exp_40_1_2 },";
        continue;
    }
    if (strpos($line, "40(3)") !== false) {
        $lines[$i] = "      { name: '40(3) ค่าลิขสิทธิ์และสิทธิบัตร', rule: 'หักค่าใช้จ่ายเหมา 50% สูงสุด 100,000 บาท', inc: Number(document.getElementById('inc_40_3')?.value) || 0, exp: b.exp_40_3 },";
        continue;
    }
    if (strpos($line, "40(4)") !== false) {
        $lines[$i] = "      { name: '40(4) ดอกเบี้ย เงินปันผล', rule: 'หักค่าใช้จ่ายไม่ได้', inc: Number(document.getElementById('inc_40_4')?.value) || 0, exp: 0 },";
        continue;
    }
    if (strpos($line, "40(5)") !== false && strpos($line, "building") !== false) {
        $lines[$i] = "      { name: '40(5) ค่าเช่าบ้าน/อาคารสิ่งปลูกสร้าง', rule: 'หักเหมาอัตโนมัติ 30%', inc: Number(document.getElementById('inc_40_5_building')?.value) || 0, exp: b.exp_40_5_building },";
        continue;
    }
    if (strpos($line, "40(5)") !== false && strpos($line, "vehicle") !== false) {
        $lines[$i] = "      { name: '40(5) ค่าเช่ายานพาหนะ', rule: 'หักเหมาอัตโนมัติ 30%', inc: Number(document.getElementById('inc_40_5_vehicle')?.value) || 0, exp: b.exp_40_5_vehicle },";
        continue;
    }
    if (strpos($line, "40(5)") !== false && strpos($line, "agri") !== false) {
        $lines[$i] = "      { name: '40(5) ค่าเช่าที่ดินการเกษตร', rule: 'หักเหมาอัตโนมัติ 20%', inc: Number(document.getElementById('inc_40_5_agri')?.value) || 0, exp: b.exp_40_5_agri },";
        continue;
    }
    if (strpos($line, "40(5)") !== false && strpos($line, "other_land") !== false) {
        $lines[$i] = "      { name: '40(5) ค่าเช่าที่ดินอื่น ๆ', rule: 'หักเหมาอัตโนมัติ 15%', inc: Number(document.getElementById('inc_40_5_other_land')?.value) || 0, exp: b.exp_40_5_other_land },";
        continue;
    }
    if (strpos($line, "40(5)") !== false && strpos($line, "other") !== false) {
        $lines[$i] = "      { name: '40(5) ค่าเช่าทรัพย์สินอื่น', rule: 'หักเหมาอัตโนมัติ 10%', inc: Number(document.getElementById('inc_40_5_other')?.value) || 0, exp: b.exp_40_5_other },";
        continue;
    }
    if (strpos($line, "40(6)") !== false && strpos($line, "medical") !== false) {
        $lines[$i] = "      { name: '40(6) วิชาชีพอิสระแพทย์', rule: 'หักเหมาอัตโนมัติ 60%', inc: Number(document.getElementById('inc_40_6_medical')?.value) || 0, exp: b.exp_40_6_medical },";
        continue;
    }
    if (strpos($line, "40(6)") !== false && strpos($line, "other") !== false) {
        $lines[$i] = "      { name: '40(6) วิชาชีพอิสระอื่น (กฎหมาย บัญชี วิศวกรรม)', rule: 'หักเหมาอัตโนมัติ 30%', inc: Number(document.getElementById('inc_40_6_other')?.value) || 0, exp: b.exp_40_6_other },";
        continue;
    }
    if (strpos($line, "40(7)") !== false) {
        $lines[$i] = "      { name: '40(7) รับเหมาก่อสร้าง/จัดหาสัมภาระ', rule: 'หักเหมาอัตโนมัติ 60%', inc: Number(document.getElementById('inc_40_7')?.value) || 0, exp: b.exp_40_7 },";
        continue;
    }
    if (strpos($line, "40(8)") !== false) {
        $lines[$i] = "      { name: '40(8) การพาณิชย์ ค้าขาย ธุรกิจทั่วไป', rule: 'หักเหมาอัตโนมัติ 60%', inc: Number(document.getElementById('inc_40_8')?.value) || 0, exp: b.exp_40_8 }";
        continue;
    }

    // Table rows currency symbols
    if (strpos($line, '${formatMoney(item.inc)}') !== false) {
        $lines[$i] = '          <td style="text-align:right;">${formatMoney(item.inc)} บาท</td>';
        continue;
    }
    if (strpos($line, '-${formatMoney(item.exp)}') !== false) {
        $lines[$i] = '          <td style="text-align:right; font-weight:700; color:#DC2626;">-${formatMoney(item.exp)} บาท</td>';
        continue;
    }
    if (strpos($line, "ยังไม่มีข้อมูลรายได้") !== false || (strpos($line, "tbody.innerHTML") !== false && strpos($line, "colspan=\"4\"") !== false)) {
        $lines[$i] = "      tbody.innerHTML = `<tr><td colspan=\"4\" style=\"text-align:center; color:#64748B; padding:1.25rem;\">ยังไม่มีข้อมูลรายได้ที่ระบุ</td></tr>`;";
        continue;
    }

    // Step 3 Summaries
    if (strpos($line, "sum-taxpayer-type-label") !== false) {
        if (strpos($line, "50/51") !== false || $i > 550) {
            $lines[$i] = "    document.getElementById('sum-taxpayer-type-label').textContent = 'นิติบุคคล (ภ.ง.ด. 50/51)';";
        } else {
            $lines[$i] = "    document.getElementById('sum-taxpayer-type-label').textContent = 'บุคคลธรรมดา (ภ.ง.ด. 90/91)';";
        }
        continue;
    }
    if (strpos($line, "sum-selected-method") !== false) {
        $lines[$i] = "    document.getElementById('sum-selected-method').textContent = res.selectedMethod === 'method1' ? 'วิธีที่ 1 (อัตราก้าวหน้า)' : 'วิธีที่ 2 (คำนวณร้อยละ 0.5)';";
        continue;
    }
    if (strpos($line, "sum-credits-amount") !== false) {
        if ($i > 550) {
            $lines[$i] = "    document.getElementById('sum-credits-amount').textContent = formatMoney(res.totalTaxCredits) + ' บาท (หัก ณ ที่จ่าย + ภ.ง.ด.51)';";
        } else {
            $lines[$i] = "    document.getElementById('sum-credits-amount').textContent = formatMoney(res.withholdingTax) + ' บาท';";
        }
        continue;
    }
    if (strpos($line, "sum-total-income") !== false) {
        $lines[$i] = "    document.getElementById('sum-total-income').textContent = formatMoney(res.totalIncome || res.totalRevenue) + ' บาท';";
        continue;
    }
    if (strpos($line, "sum-total-expense") !== false) {
        $lines[$i] = "    document.getElementById('sum-total-expense').textContent = '-' + formatMoney(res.totalExpense || res.totalExpenses) + ' บาท';";
        continue;
    }
    if (strpos($line, "sum-total-allowance") !== false) {
        $lines[$i] = "    document.getElementById('sum-total-allowance').textContent = '-' + formatMoney(res.totalAllowance || res.donationAllowed) + ' บาท';";
        continue;
    }
    if (strpos($line, "sum-net-income") !== false) {
        $lines[$i] = "    document.getElementById('sum-net-income').textContent = formatMoney(res.netTaxableIncome || res.netTaxableProfit) + ' บาท';";
        continue;
    }
    if (strpos($line, "taxableAmount") !== false && strpos($line, "</td>") !== false) {
        $lines[$i] = "          <td style=\"text-align:right;\">\${formatMoney(b.taxableAmount)} บาท</td>";
        continue;
    }
    if (strpos($line, "taxAmount") !== false && strpos($line, "</strong></td>") !== false) {
        $lines[$i] = "          <td style=\"text-align:right;\"><strong>\${formatMoney(b.taxAmount)} บาท</strong></td>";
        continue;
    }
    if (strpos($line, "sum-method1-tax") !== false) {
        $lines[$i] = "    document.getElementById('sum-method1-tax').textContent = formatMoney(res.progressive.totalTax) + ' บาท';";
        continue;
    }
    if (strpos($line, "sum-method2-tax") !== false) {
        $lines[$i] = "    document.getElementById('sum-method2-tax').textContent = res.flat.isApplicable ? formatMoney(res.flat.flatTax) + ' บาท' : 'ไม่เข้าเกณฑ์วิธีที่ 2 (ภาษีไม่ถึง 5,000 บาท หรือรายได้ไม่ถึงเกณฑ์)';";
        continue;
    }

    // Section 5: Profile & Header Login
    if (strpos($line, "btn-open-admin") !== false) {
        $lines[$i] = "          ? `<button id=\"btn-open-admin\" class=\"btn btn-admin btn-sm\" title=\"แดชบอร์ดผู้ดูแลระบบ\">⚡ แดชบอร์ด (Admin)</button>`";
        continue;
    }
    if (strpos($line, "btn-open-profile") !== false) {
        $lines[$i] = "          <div class=\"user-pill\" style=\"cursor:pointer;\" id=\"btn-open-profile\" title=\"ดูและแก้ไขข้อมูลโปรไฟล์\">";
        continue;
    }
    if (strpos($line, "btn-open-saved") !== false) {
        $lines[$i] = "          <button id=\"btn-open-saved\" class=\"btn btn-secondary btn-sm\" title=\"ดูรายการภาษีที่บันทึกไว้\">";
        continue;
    }
    if (strpos($line, "รายการที่บันทึกไว้") !== false || (strpos($line, "btn-open-saved") !== false && $i >= 650 && $i <= 660)) {
        $lines[$i] = "            📂 รายการที่บันทึกไว้";
        continue;
    }
    if (strpos($line, "btn-logout") !== false) {
        $lines[$i] = "          <button id=\"btn-logout\" class=\"btn btn-danger-ghost btn-sm\" title=\"ออกจากระบบ\">";
        continue;
    }
    if ($i == 655 || $i == 656) {
        $lines[$i] = "            ออกจากระบบ";
        continue;
    }
    if (strpos($line, "btn-open-login") !== false && $i < 700) {
        $lines[$i] = "          <button id=\"btn-open-login\" class=\"btn btn-secondary btn-sm\">🔑 เข้าสู่ระบบ</button>";
        continue;
    }
    if (strpos($line, "btn-open-register") !== false && $i < 700) {
        $lines[$i] = "          <button id=\"btn-open-register\" class=\"btn btn-primary btn-sm\">📝 สมัครสมาชิก</button>";
        continue;
    }

    // Section 5.1 & 5.2 Auth Validation & Toast
    if (strpos($line, "err-login") !== false) {
        if (strpos($line, "full_name") !== false || strpos($line, "ยินดี") !== false) {
            // Toast
        } elseif (strpos($line, "เชื่อมต่อ") !== false || strpos($line, "network") !== false || $i >= 748) {
            $lines[$i] = "      setFieldError('err-login', '⚠️ เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');";
        } else {
            $lines[$i] = "      setFieldError('err-login', 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');";
        }
        continue;
    }
    if (strpos($line, "ยินดีต้อนรับ") !== false || (strpos($line, "showToast") !== false && strpos($line, "full_name") !== false && $i < 760)) {
        $lines[$i] = "        showToast(`ยินดีต้อนรับคุณ \${data.user.full_name} (\${data.user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'สมาชิก'})`, 'success');";
        continue;
    }
    if (strpos($line, "err-fullname") !== false) {
        $lines[$i] = "      setFieldError('err-fullname', 'กรุณากรอกชื่อ-นามสกุล');";
        continue;
    }
    if (strpos($line, "err-username") !== false) {
        if (strpos($line, "3") !== false) {
            $lines[$i] = "      setFieldError('err-username', 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร');";
        } elseif (strpos($line, "30") !== false) {
            $lines[$i] = "      setFieldError('err-username', 'ชื่อผู้ใช้ยาวเกินไป (สูงสุด 30 ตัวอักษร)');";
        } elseif (strpos($line, "a-z") !== false) {
            $lines[$i] = "      setFieldError('err-username', 'ชื่อผู้ใช้ควรมีเฉพาะ a-z, A-Z, 0-9 หรือ _ เท่านั้น');";
        } else {
            $lines[$i] = "      setFieldError('err-username', 'กรุณากรอกชื่อผู้ใช้');";
        }
        continue;
    }
    if (strpos($line, "err-password") !== false) {
        if (strpos($line, "4") !== false) {
            $lines[$i] = "      setFieldError('err-password', 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');";
        } else {
            $lines[$i] = "      setFieldError('err-password', 'กรุณากรอกรหัสผ่าน');";
        }
        continue;
    }
    if (strpos($line, "err-email") !== false) {
        $lines[$i] = "      setFieldError('err-email', 'รูปแบบอีเมลไม่ถูกต้อง');";
        continue;
    }
    if (strpos($line, "err-taxid") !== false) {
        if (strpos($line, "13") !== false) {
            $lines[$i] = "      setFieldError('err-taxid', 'เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก');";
        } else {
            $lines[$i] = "      setFieldError('err-taxid', 'เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลขเท่านั้น');";
        }
        continue;
    }
    if (strpos($line, "showToast") !== false && strpos($line, "full_name") !== false && $i >= 835 && $i <= 845) {
        $lines[$i] = "        showToast('🎉 สมัครสมาชิกและเข้าสู่ระบบสำเร็จ! ยินดีต้อนรับคุณ ' + data.user.full_name, 'success');";
        continue;
    }
    if (strpos($line, "data.message || '") !== false && $i >= 840 && $i <= 850) {
        $lines[$i] = "        const msg = data.message || 'สมัครสมาชิกไม่สำเร็จ';";
        continue;
    }
    if (strpos($line, "showToast('ออกจากระบบ") !== false || ($i >= 865 && $i <= 872 && strpos($line, "showToast") !== false)) {
        $lines[$i] = "      showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');";
        continue;
    }

    // Profile updates
    if (strpos($line, "preview.innerHTML = '") !== false) {
        $lines[$i] = "      preview.innerHTML = '👤';";
        continue;
    }
    if (strpos($line, "showToast('กรุณากรอกชื่อ-นามสกุล") !== false || ($i >= 915 && $i <= 922 && strpos($line, "showToast") !== false)) {
        $lines[$i] = "      showToast('กรุณากรอกชื่อ-นามสกุล', 'error');";
        continue;
    }
    if ($i >= 938 && $i <= 945 && strpos($line, "showToast") !== false && strpos($line, "'success'") !== false) {
        $lines[$i] = "        showToast('บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว', 'success');";
        continue;
    }

    // Admin members table
    if (strpos($line, "tbody.innerHTML") !== false && strpos($line, "กำลังโหลด") !== false) {
        $lines[$i] = "    tbody.innerHTML = '<tr><td colspan=\"7\" style=\"text-align:center; padding:1.5rem; color:#92400E;\">กำลังโหลดรายชื่อสมาชิก...</td></tr>';";
        continue;
    }
    if (strpos($line, "tbody.innerHTML") !== false && strpos($line, "ไม่พบข้อมูล") !== false) {
        $lines[$i] = "        tbody.innerHTML = '<tr><td colspan=\"7\" style=\"text-align:center; padding:1.5rem; color:#64748B;\">ไม่พบข้อมูลสมาชิก</td></tr>';";
        continue;
    }
    if (strpos($line, "<span class=\"tag-badge\">") !== false && strpos($line, "สมาชิก") !== false) {
        $lines[$i] = "          : '<span class=\"tag-badge\">สมาชิก</span>';";
        continue;
    }
    if (strpos($line, "records_count") !== false) {
        $lines[$i] = "          <td><span class=\"tag-badge\" style=\"background:#EFF6FF; color:#1E40AF;\">\${m.records_count} รายการ</span></td>";
        continue;
    }
    if (strpos($line, "btn-inspect-member") !== false || ($i >= 1028 && $i <= 1032 && strpos($line, "btn") !== false)) {
        $lines[$i] = "            <button class=\"btn btn-secondary btn-sm btn-inspect-member\" data-id=\"\${m.id}\" data-name=\"\${m.full_name}\" title=\"ดูรายการภาษี\">🔍 ดูรายการภาษี</button>";
        continue;
    }
    if (strpos($line, "btn-toggle-role") !== false || ($i >= 1032 && $i <= 1035 && strpos($line, "role") !== false)) {
        $lines[$i] = "              <button class=\"btn btn-outline-gold btn-sm btn-toggle-role\" data-id=\"\${m.id}\" title=\"เปลี่ยนสิทธิ์\"> \${m.role === 'admin' ? 'ปลดเป็นสมาชิก' : 'ตั้งเป็น Admin'}</button>";
        continue;
    }
    if (strpos($line, "btn-delete-member") !== false || ($i >= 1035 && $i <= 1038 && strpos($line, "delete") !== false)) {
        $lines[$i] = "              <button class=\"btn btn-danger-ghost btn-sm btn-delete-member\" data-id=\"\${m.id}\" title=\"ลบสมาชิก\">🗑️ ลบ</button>";
        continue;
    }

    // Member records modal
    if (strpos($line, "admin-member-records-title") !== false) {
        $lines[$i] = "      document.getElementById('admin-member-records-title').innerHTML = `📂 รายการภาษีของสมาชิก: <strong>\${fullName}</strong>`;";
        continue;
    }
    if (strpos($line, "ยังไม่มีรายการภาษีที่บันทึกไว้") !== false || ($i >= 1065 && $i <= 1070 && strpos($line, "listContainer.innerHTML") !== false)) {
        $lines[$i] = "        listContainer.innerHTML = '<p style=\"text-align:center; color:#64748B; padding:2rem;\">สมาชิกท่านนี้ยังไม่มีรายการภาษีที่บันทึกไว้</p>';";
        continue;
    }
    if (strpos($line, "badge-corp") !== false && strpos($line, "badge-ind") !== false) {
        $lines[$i] = "            ? '<span class=\"detail-badge-type badge-corp\">🏢 นิติบุคคล</span>' : '<span class=\"detail-badge-type badge-ind\">👤 บุคคลธรรมดา</span>';";
        continue;
    }
    if (strpos($line, "rec.tax_year") !== false && strpos($line, "tag-badge") !== false && strpos($line, "<h4>") !== false) {
        $lines[$i] = "              <h4>\${rec.title} \${typeBadge} <span class=\"tag-badge\">ปี \${rec.tax_year}</span></h4>";
        continue;
    }
    if (strpos($line, "toLocaleDateString('th-TH')") !== false && strpos($line, "<p>") !== false) {
        $lines[$i] = "              <p>ยอดรวม: \${formatMoney(sum.totalIncome || sum.totalRevenue)} บาท | \${taxText} | วันที่บันทึก: \${new Date(rec.updated_at).toLocaleDateString('th-TH')}</p>";
        continue;
    }

    // Save record modal
    if (strpos($line, "defaultTitle") !== false || ($i >= 1160 && $i <= 1165 && strpos($line, "taxpayerType") !== false)) {
        $lines[$i] = "    const defaultTitle = taxpayerType === 'individual' ? `แบบคำนวณภาษีบุคคลธรรมดา ปี \${year}` : `แบบคำนวณภาษีนิติบุคคล ปี \${year}`;";
        continue;
    }
    if (strpos($line, "showToast") !== false && strpos($line, "บันทึกข้อมูล") !== false && $i >= 1190 && $i <= 1200) {
        $lines[$i] = "        showToast('บันทึกข้อมูลภาษีเรียบร้อยแล้ว สามารถดูประวัติได้ในเมนูรายการที่บันทึกไว้', 'success');";
        continue;
    }

    // Detailed inspector modal
    if (strpos($line, "inspector-modal-title") !== false) {
        $lines[$i] = "      document.getElementById('inspector-modal-title').innerHTML = `📋 รายละเอียดแบบคำนวณภาษี: <strong>\${rec.title}</strong>`;";
        continue;
    }
    if (strpos($line, "detail-section-title") !== false && strpos($line, "40(1)") !== false) {
        $lines[$i] = "            <div class=\"detail-section-title\">1. รายละเอียดเงินได้พึงประเมิน 40(1) - 40(8)</div>";
        continue;
    }
    if (strpos($line, "detail-section-title") !== false && strpos($line, "2.") !== false && $i < 1350) {
        $lines[$i] = "            <div class=\"detail-section-title\">2. สรุปค่าใช้จ่ายที่หักได้ตามกฎหมาย</div>";
        continue;
    }
    if (strpos($line, "detail-section-title") !== false && strpos($line, "3.") !== false && $i < 1350) {
        $lines[$i] = "            <div class=\"detail-section-title\">3. ค่าลดหย่อนภาษีทุกกลุ่ม</div>";
        continue;
    }
    if (strpos($line, "detail-section-title") !== false && strpos($line, "Revenue") !== false) {
        $lines[$i] = "            <div class=\"detail-section-title\">1. รายได้กิจการ (Revenue)</div>";
        continue;
    }
    if (strpos($line, "detail-section-title") !== false && strpos($line, "Expenses") !== false) {
        $lines[$i] = "            <div class=\"detail-section-title\">2. รายจ่ายและต้นทุน (Expenses)</div>";
        continue;
    }
    if (strpos($line, "detail-section-title") !== false && strpos($line, "SME") !== false) {
        $lines[$i] = "            <div class=\"detail-section-title\">3. เกณฑ์และการคำนวณ SME</div>";
        continue;
    }
    if (strpos($line, "detail-section-title") !== false && strpos($line, "4.") !== false) {
        $lines[$i] = "          <div class=\"detail-section-title\">4. สรุปผลภาษีสุทธิ</div>";
        continue;
    }

    // Support ticket categories
    if (strpos($line, "calculation_issue:") !== false) {
        $lines[$i] = "    calculation_issue: '🔢 แจ้งปัญหาการคำนวณ',";
        continue;
    }
    if (strpos($line, "tax_law:") !== false) {
        $lines[$i] = "    tax_law:           '📜 สอบถามข้อกฎหมายภาษี',";
        continue;
    }
    if (strpos($line, "bug:") !== false) {
        $lines[$i] = "    bug:               '🐛 ระบบทำงานผิดพลาด',";
        continue;
    }
    if (strpos($line, "suggestion:") !== false) {
        $lines[$i] = "    suggestion:        '💡 ข้อเสนอแนะ',";
        continue;
    }
    if (strpos($line, "other:") !== false && $i > 1580 && $i < 1610) {
        $lines[$i] = "    other:             '❓ อื่น ๆ'";
        continue;
    }

    // Deadline countdown
    if (strpos($line, "deadline-status-individual") !== false) {
        $lines[$i] = "      { id: 'deadline-status-individual', date: new Date(2025, 2, 31), label: '1 - 31 มีนาคม 2568' },";
        continue;
    }
    if (strpos($line, "deadline-status-corporate") !== false) {
        $lines[$i] = "      { id: 'deadline-status-corporate',  date: new Date(2025, 4, 31), label: '31 พฤษภาคม 2568' }";
        continue;
    }
}

// Clean remaining ??
$repaired = implode("\n", $lines);

// Remove any remaining raw "??" if in comments
$repaired = preg_replace('/(\/\/[^\n]*)\?{2,}([^\n]*)/u', '$1$2', $repaired);

file_put_contents($file, $repaired);
echo "Repaired app.js written successfully!\n";
echo "app.js isUTF8=" . (mb_check_encoding($repaired, 'UTF-8') ? 'YES' : 'NO') . "\n";
