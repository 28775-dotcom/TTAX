<?php
// finish_clean_strings.php

$file = 'js/app.js';
$lines = explode("\n", file_get_contents($file));

for ($i = 0; $i < count($lines); $i++) {
    $line = $lines[$i];

    // If it's pure JavaScript nullish coalescing (like "??" in expression), keep it!
    if (strpos($line, '?.') !== false && strpos($line, '?? true') !== false) {
        continue;
    }
    if (strpos($line, '?? false') !== false) {
        continue;
    }

    // Clean comments that have ???
    if (preg_match('/^\s*\/\//', $line) && strpos($line, '?') !== false) {
        if (strpos($line, 'Sticky Sidebar') !== false) {
            $lines[$i] = "      // ข้อมูลแสดงบน Sticky Sidebar";
        } elseif (strpos($line, 'Step 3') !== false && strpos($line, 'Summary') !== false) {
            $lines[$i] = "      // อัปเดตข้อมูลหน้าสรุป Step 3";
        } elseif (strpos($line, 'Corporate Summary') !== false) {
            $lines[$i] = "      // อัปเดตข้อมูลหน้าสรุปนิติบุคคล Step 3";
        } elseif (strpos($line, 'Profile') !== false) {
            $lines[$i] = "  // 5. ข้อมูลโปรไฟล์และระบบระบุตัวตน (Profile & Avatar)";
        } elseif (strpos($line, 'Client-side validation') !== false) {
            $lines[$i] = "    // ตรวจสอบความถูกต้องของข้อมูล (Client-side validation)";
        } elseif (strpos($line, 'Submit to server') !== false) {
            $lines[$i] = "    // ส่งข้อมูลไปยังเซิร์ฟเวอร์ (Submit to server)";
        } elseif (strpos($line, 'Admin Portal') !== false) {
            $lines[$i] = "  // 7. แดชบอร์ดผู้ดูแลระบบ (Admin Portal & Inspector)";
        } elseif (strpos($line, 'Detailed Inspector') !== false) {
            $lines[$i] = "  // 8. ประวัติการบันทึกภาษีและดูรายละเอียดเชิงลึก (Saved Records & Detailed Inspector)";
        } elseif (strpos($line, 'Presets') !== false) {
            $lines[$i] = "  // 9. โหลดชุดข้อมูลตัวอย่าง (Presets)";
        } elseif (strpos($line, 'Support Tickets') !== false) {
            $lines[$i] = "  // 9.5 แจ้งปัญหาและติดต่อแอดมิน (Support Tickets & Chat)";
        } elseif (strpos($line, 'Chat Widget') !== false) {
            $lines[$i] = "  // แชทสอบถามปัญหาและแจ้งเรื่อง (Chat Widget)";
        } elseif (strpos($line, 'Deadline Banner') !== false) {
            $lines[$i] = "  // 10.0 กำหนดการยื่นภาษี (Filing Deadline Banner)";
        } elseif (strpos($line, 'Event Listeners') !== false) {
            $lines[$i] = "  // 10. ผูกเหตุการณ์และเริ่มต้นระบบ (Event Listeners & Initialize)";
        } else {
            // General comment cleanup
            $lines[$i] = preg_replace('/(\/\/\s*)[?\s]+(.*)$/u', '$1$2', $line);
            if (trim($lines[$i]) === '//') $lines[$i] = '';
        }
        continue;
    }

    // Clean strings containing ?
    if (strpos($line, '?') !== false) {
        // Auth error checks
        if (strpos($line, "msg.includes(") !== false) {
            if (strpos($line, "username") !== false || strpos($line, "ชื่อผู้ใช้") !== false) {
                $lines[$i] = "        if (msg.includes('ชื่อผู้ใช้') || msg.includes('username')) {";
            } elseif (strpos($line, "password") !== false || strpos($line, "รหัสผ่าน") !== false) {
                $lines[$i] = "        } else if (msg.includes('รหัสผ่าน') || msg.includes('password')) {";
            } elseif (strpos($line, "full_name") !== false || strpos($line, "ชื่อ") !== false) {
                $lines[$i] = "        } else if (msg.includes('ชื่อ-นามสกุล') || msg.includes('full_name')) {";
            }
            continue;
        }

        if (strpos($line, "setFieldError('err-login'") !== false) {
            $lines[$i] = "      setFieldError('err-login', '⚠️ เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');";
            continue;
        }

        if (strpos($line, "showToast") !== false && strpos($line, "msg") !== false && strpos($line, "'error'") !== false) {
            $lines[$i] = "          showToast('⚠️ ' + msg, 'error');";
            continue;
        }

        // Admin members
        if (strpos($line, "tag-badge") !== false && strpos($line, "สมาชิก") !== false) {
            $lines[$i] = "          : '<span class=\"tag-badge\">สมาชิก</span>';";
            continue;
        }
        if (strpos($line, "btn-inspect-member") !== false || strpos($line, "ดูรายการภาษี") !== false) {
            $lines[$i] = "            <button class=\"btn btn-secondary btn-sm btn-inspect-member\" data-id=\"\${m.id}\" data-name=\"\${m.full_name}\" title=\"ดูรายการภาษี\">🔍 ดูรายการภาษี</button>";
            continue;
        }
        if (strpos($line, "btn-delete-member") !== false || ($i >= 1034 && $i <= 1040 && strpos($line, "btn-danger") !== false)) {
            $lines[$i] = "              <button class=\"btn btn-danger-ghost btn-sm btn-delete-member\" data-id=\"\${m.id}\" title=\"ลบสมาชิก\">🗑️ ลบ</button>";
            continue;
        }
        if (strpos($line, "tbody.innerHTML") !== false && strpos($line, "เกิดข้อผิดพลาด") !== false) {
            $lines[$i] = "      tbody.innerHTML = '<tr><td colspan=\"7\" style=\"text-align:center; color:#DC2626; padding:1.5rem;\">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';";
            continue;
        }
        if (strpos($line, "showToast") !== false && strpos($line, "เปลี่ยนบทบาท") !== false) {
            $lines[$i] = "        showToast('ไม่สามารถเปลี่ยนบทบาทผู้ดูแลระบบหลักได้', 'error');";
            continue;
        }

        // Member badges
        if (strpos($line, "badge-corp") !== false && strpos($line, "badge-ind") !== false) {
            $lines[$i] = "            ? '<span class=\"detail-badge-type badge-corp\">🏢 นิติบุคคล</span>' : '<span class=\"detail-badge-type badge-ind\">👤 บุคคลธรรมดา</span>';";
            continue;
        }
        if (strpos($line, "sum.finalAmount") !== false && strpos($line, "#DC2626") !== false) {
            $lines[$i] = "            ? `<span style=\"color:#DC2626; font-weight:600;\">ชำระเพิ่ม \${formatMoney(sum.finalAmount)} บาท</span>`";
            continue;
        }
        if (strpos($line, "sum.finalAmount") !== false && strpos($line, "#059669") !== false) {
            $lines[$i] = "            ? `<span style=\"color:#059669; font-weight:600;\">ได้คืน \${formatMoney(sum.finalAmount)} บาท</span>` : '<span>ไม่มีภาษีชำระเพิ่ม</span>';";
            continue;
        }
        if (strpos($line, "rec.tax_year") !== false && strpos($line, "tag-badge") !== false) {
            $lines[$i] = "            <h4>\${rec.title} \${typeBadge} <span class=\"tag-badge\">ปี \${rec.tax_year}</span></h4>";
            continue;
        }
        if (strpos($line, "toLocaleDateString") !== false) {
            $lines[$i] = "            <p>ยอดรวม: \${formatMoney(sum.totalIncome || sum.totalRevenue)} บาท | \${taxText} | วันที่บันทึก: \${new Date(rec.updated_at).toLocaleDateString('th-TH')}</p>";
            continue;
        }
        if (strpos($line, "ดูรายละเอียด") !== false && strpos($line, "btn") !== false) {
            $lines[$i] = "            <button class=\"btn btn-secondary btn-sm btn-inspect\" data-id=\"\${rec.id}\">🔍 ดูรายละเอียด</button>";
            continue;
        }
        if (strpos($line, "btn-del") !== false) {
            $lines[$i] = "            <button class=\"btn btn-danger-ghost btn-sm btn-del\" data-id=\"\${rec.id}\" title=\"ลบ\">🗑️ ลบ</button>";
            continue;
        }
        if (strpos($line, "confirm") !== false && strpos($line, "เปลี่ยนสิทธิ์") !== false) {
            $lines[$i] = "    if (!confirm('ต้องการเปลี่ยนสิทธิ์ของสมาชิกท่านนี้ใช่หรือไม่?')) return;";
            continue;
        }
        if (strpos($line, "confirm") !== false && strpos($line, "ลบสมาชิก") !== false) {
            $lines[$i] = "    if (!confirm('⚠️ คำเตือน: คุณแน่ใจหรือไม่ว่าต้องการลบสมาชิกท่านนี้? ข้อมูลภาษีทั้งหมดของสมาชิกจะถูกลบถาวร')) return;";
            continue;
        }
        if (strpos($line, "showToast") !== false && strpos($line, "ลบสมาชิก") !== false) {
            $lines[$i] = "        showToast('ลบสมาชิกเรียบร้อยแล้ว', 'success');";
            continue;
        }

        // Save records prompt
        if (strpos($line, "showToast") !== false && strpos($line, "กรอกข้อมูลภาษี") !== false) {
            $lines[$i] = "      showToast('กรุณากรอกข้อมูลภาษีอย่างน้อยหนึ่งรายการ', 'info');";
            continue;
        }
        if (strpos($line, "defaultTitle") !== false) {
            $lines[$i] = "    const defaultTitle = taxpayerType === 'individual' ? `แบบคำนวณภาษีบุคคลธรรมดา ปี \${year}` : `แบบคำนวณภาษีนิติบุคคล ปี \${year}`;";
            continue;
        }
        if (strpos($line, "listContainer.innerHTML") !== false && strpos($line, "ยังไม่มีรายการ") !== false) {
            $lines[$i] = "        listContainer.innerHTML = '<p style=\"text-align:center; color:#64748B; padding:2rem;\">ยังไม่มีรายการภาษีที่บันทึกไว้</p>';";
            continue;
        }

        // Inspector Modal
        if (strpos($line, "inspector-modal-title") !== false) {
            $lines[$i] = "      document.getElementById('inspector-modal-title').innerHTML = `📋 รายละเอียดแบบคำนวณภาษี: <strong>\${rec.title}</strong>`;";
            continue;
        }
        if (strpos($line, "detail-badge-type") !== false) {
            $lines[$i] = "            <span class=\"detail-badge-type \${isCorp ? 'badge-corp' : 'badge-ind'}\">\${isCorp ? '🏢 นิติบุคคล (ภ.ง.ด. 50/51)' : '👤 บุคคลธรรมดา (ภ.ง.ด. 90/91)'}</span>";
            continue;
        }
        if (strpos($line, "rec.title") !== false && strpos($line, "<strong>") !== false) {
            $lines[$i] = "            <tr><td>ชื่อชุดข้อมูล:</td><td><strong>\${rec.title}</strong></td></tr>";
            continue;
        }
        if (strpos($line, "rec.full_name") !== false && strpos($line, "username") !== false) {
            $lines[$i] = "            \${rec.full_name ? `<tr><td>ผู้บันทึก:</td><td><strong>\${rec.full_name} (\${rec.username})</strong></td></tr>` : ''}";
            continue;
        }
        if (strpos($line, "rec.tax_year") !== false && strpos($line, "tr") !== false) {
            $lines[$i] = "            <tr><td>ปีภาษี:</td><td>\${rec.tax_year}</td></tr>";
            continue;
        }
        if (strpos($line, "updated_at") !== false && strpos($line, "toLocaleString") !== false) {
            $lines[$i] = "            <tr><td>อัปเดตล่าสุด:</td><td>\${new Date(rec.updated_at).toLocaleString('th-TH')}</td></tr>";
            continue;
        }

        // Breakdown detailed rows
        if (strpos($line, "inc.inc_40_1") !== false) {
            $lines[$i] = "              \${inc.inc_40_1 ? `<tr><td>40(1) เงินเดือน ค่าจ้าง โบนัส:</td><td>\${formatMoney(inc.inc_40_1)} บาท</td></tr>` : ''}";
            continue;
        }
        if (strpos($line, "inc.inc_40_2") !== false) {
            $lines[$i] = "              \${inc.inc_40_2 ? `<tr><td>40(2) ค่าจ้างทั่วไป ค่านายหน้า ฟรีแลนซ์:</td><td>\${formatMoney(inc.inc_40_2)} บาท</td></tr>` : ''}";
            continue;
        }
        if (strpos($line, "inc.inc_40_3") !== false) {
            $lines[$i] = "              \${inc.inc_40_3 ? `<tr><td>40(3) ค่าลิขสิทธิ์ สิทธิบัตร:</td><td>\${formatMoney(inc.inc_40_3)} บาท</td></tr>` : ''}";
            continue;
        }
        if (strpos($line, "inc.inc_40_4") !== false) {
            $lines[$i] = "              \${inc.inc_40_4 ? `<tr><td>40(4) ดอกเบี้ย เงินปันผล:</td><td>\${formatMoney(inc.inc_40_4)} บาท</td></tr>` : ''}";
            continue;
        }
        if (strpos($line, "inc.inc_40_5_building") !== false) {
            $lines[$i] = "              \${inc.inc_40_5_building ? `<tr><td>40(5) ค่าเช่าบ้าน อาคาร สิ่งปลูกสร้าง:</td><td>\${formatMoney(inc.inc_40_5_building)} บาท</td></tr>` : ''}";
            continue;
        }
        if (strpos($line, "inc.inc_40_5_vehicle") !== false) {
            $lines[$i] = "              \${inc.inc_40_5_vehicle ? `<tr><td>40(5) ค่าเช่ายานพาหนะ:</td><td>\${formatMoney(inc.inc_40_5_vehicle)} บาท</td></tr>` : ''}";
            continue;
        }
        if (strpos($line, "inc.inc_40_6_medical") !== false) {
            $lines[$i] = "              \${inc.inc_40_6_medical ? `<tr><td>40(6) วิชาชีพอิสระการประกอบโรคศิลปะ:</td><td>\${formatMoney(inc.inc_40_6_medical)} บาท</td></tr>` : ''}";
            continue;
        }
        if (strpos($line, "inc.inc_40_6_other") !== false) {
            $lines[$i] = "              \${inc.inc_40_6_other ? `<tr><td>40(6) วิชาชีพอิสระอื่น (กฎหมาย บัญชี สถาปัตย์):</td><td>\${formatMoney(inc.inc_40_6_other)} บาท</td></tr>` : ''}";
            continue;
        }
        if (strpos($line, "inc.inc_40_7") !== false) {
            $lines[$i] = "              \${inc.inc_40_7 ? `<tr><td>40(7) รับเหมาก่อสร้างและจัดหาสัมภาระ:</td><td>\${formatMoney(inc.inc_40_7)} บาท</td></tr>` : ''}";
            continue;
        }
        if (strpos($line, "inc.inc_40_8") !== false) {
            $lines[$i] = "              \${inc.inc_40_8 ? `<tr><td>40(8) ธุรกิจ การพาณิชย์ และอื่น ๆ:</td><td>\${formatMoney(inc.inc_40_8)} บาท</td></tr>` : ''}";
            continue;
        }
        if (strpos($line, "sum.totalIncome") !== false && strpos($line, "background:#FEF3C7") !== false) {
            $lines[$i] = "              <tr style=\"background:#FEF3C7; font-weight:700;\"><td>รวมเงินได้พึงประเมินทั้งหมด:</td><td>\${formatMoney(sum.totalIncome)} บาท</td></tr>";
            continue;
        }

        // Allowances breakdown
        if (strpos($line, "has_spouse_no_income") !== false) {
            $lines[$i] = "              \${all.has_spouse_no_income ? '<tr><td>ลดหย่อนคู่สมรส (ไม่มีเงินได้):</td><td>60,000 บาท</td></tr>' : ''}";
            continue;
        }
        if (strpos($line, "child_before_2561") !== false) {
            $lines[$i] = "              \${all.child_before_2561 ? `<tr><td>บุตรเกิดก่อนปี 2561 (\${all.child_before_2561} คน):</td><td>\${formatMoney(all.child_before_2561 * 30000)} บาท</td></tr>` : ''}";
            continue;
        }
        if (strpos($line, "child_after_2561") !== false) {
            $lines[$i] = "              \${all.child_after_2561 ? `<tr><td>บุตรคนที่ 2 ขึ้นไปเกิดปี 2561 เป็นต้นไป (\${all.child_after_2561} คน):</td><td>\${formatMoney(all.child_after_2561 * 60000)} บาท</td></tr>` : ''}";
            continue;
        }
        if (strpos($line, "social_security") !== false) {
            $lines[$i] = "              \${all.social_security ? `<tr><td>ประกันสังคม:</td><td>\${formatMoney(all.social_security)} บาท</td></tr>` : ''}";
            continue;
        }
        if (strpos($line, "life_insurance") !== false) {
            $lines[$i] = "              \${all.life_insurance ? `<tr><td>ประกันชีวิตทั่วไป:</td><td>\${formatMoney(all.life_insurance)} บาท</td></tr>` : ''}";
            continue;
        }
        if (strpos($line, "health_insurance") !== false) {
            $lines[$i] = "              \${all.health_insurance ? `<tr><td>ประกันสุขภาพตนเอง:</td><td>\${formatMoney(all.health_insurance)} บาท</td></tr>` : ''}";
            continue;
        }
        if (strpos($line, "all.rmf") !== false) {
            $lines[$i] = "              \${all.rmf ? `<tr><td>กองทุนรวมเพื่อการเลี้ยงชีพ (RMF):</td><td>\${formatMoney(all.rmf)} บาท</td></tr>` : ''}";
            continue;
        }
        if (strpos($line, "all.ssf") !== false) {
            $lines[$i] = "              \${all.ssf ? `<tr><td>กองทุนรวมเพื่อการออม (SSF):</td><td>\${formatMoney(all.ssf)} บาท</td></tr>` : ''}";
            continue;
        }
        if (strpos($line, "all.thai_esg") !== false) {
            $lines[$i] = "              \${all.thai_esg ? `<tr><td>กองทุนรวมไทยเพื่อความยั่งยืน (Thai ESG):</td><td>\${formatMoney(all.thai_esg)} บาท</td></tr>` : ''}";
            continue;
        }
        if (strpos($line, "home_loan_interest") !== false) {
            $lines[$i] = "              \${all.home_loan_interest ? `<tr><td>ดอกเบี้ยเงินกู้ยืมเพื่อที่อยู่อาศัย:</td><td>\${formatMoney(all.home_loan_interest)} บาท</td></tr>` : ''}";
            continue;
        }
        if (strpos($line, "sum.totalAllowance") !== false && strpos($line, "background:#FEF3C7") !== false) {
            $lines[$i] = "              <tr style=\"background:#FEF3C7; font-weight:700;\"><td>รวมค่าลดหย่อนทั้งสิ้น:</td><td style=\"color:#DC2626;\">-\${formatMoney(sum.totalAllowance)} บาท</td></tr>";
            continue;
        }

        // Corporate revenue & expenses in inspector
        if (strpos($line, "sales_revenue") !== false) {
            $lines[$i] = "              <tr><td>รายได้จากการขายและบริการหลัก:</td><td>\${formatMoney(rev.sales_revenue)} บาท</td></tr>";
            continue;
        }
        if (strpos($line, "other_revenue") !== false) {
            $lines[$i] = "              <tr><td>รายได้อื่น ๆ:</td><td>\${formatMoney(rev.other_revenue)} บาท</td></tr>";
            continue;
        }
        if (strpos($line, "exp.cogs") !== false) {
            $lines[$i] = "              <tr><td>ต้นทุนขายและบริการ (COGS):</td><td>\${formatMoney(exp.cogs)} บาท</td></tr>";
            continue;
        }
        if (strpos($line, "operating_expenses") !== false) {
            $lines[$i] = "              <tr><td>ค่าใช้จ่ายในการดำเนินงาน (SG&A):</td><td>\${formatMoney(exp.operating_expenses)} บาท</td></tr>";
            continue;
        }
        if (strpos($line, "depreciation") !== false) {
            $lines[$i] = "              <tr><td>ค่าเสื่อมราคาและค่าตัดจำหน่าย:</td><td>\${formatMoney(exp.depreciation)} บาท</td></tr>";
            continue;
        }
        if (strpos($line, "special_deductions") !== false) {
            $lines[$i] = "              <tr><td>รายจ่ายเพื่อสิทธิประโยชน์พิเศษ (200%):</td><td>\${formatMoney(exp.special_deductions)} บาท</td></tr>";
            continue;
        }
        if (strpos($line, "sum.totalExpenses") !== false && strpos($line, "background:#FEF3C7") !== false) {
            $lines[$i] = "              <tr style=\"background:#FEF3C7; font-weight:700;\"><td>รวมรายจ่ายที่หักได้ทั้งสิ้น:</td><td style=\"color:#DC2626;\">-\${formatMoney(sum.totalExpenses)} บาท</td></tr>";
            continue;
        }

        // Corporate SME criteria
        if (strpos($line, "paid_up_capital_le_5m") !== false && strpos($line, "5") !== false && strpos($line, "<tr>") !== false) {
            $lines[$i] = "              <tr><td>ทุนจดทะเบียนชำระแล้วไม่เกิน 5 ล้านบาท:</td><td>\${crit.paid_up_capital_le_5m ? '✅ ผ่านเกณฑ์' : '❌ เกิน 5 ล้านบาท'}</td></tr>";
            continue;
        }
        if (strpos($line, "isSalesLe30M") !== false && strpos($line, "30") !== false && strpos($line, "<tr>") !== false) {
            $lines[$i] = "              <tr><td>ยอดขายและรายได้รวมไม่เกิน 30 ล้านบาท:</td><td>\${sum.isSalesLe30M ? '✅ ผ่านเกณฑ์' : '❌ เกิน 30 ล้านบาท'}</td></tr>";
            continue;
        }
        if (strpos($line, "corporateTaxRateLabel") !== false) {
            $lines[$i] = "              <tr><td>อัตราภาษีที่กิจการได้รับสิทธิ:</td><td><strong>\${sum.corporateTaxRateLabel}</strong></td></tr>";
            continue;
        }
        if (strpos($line, "donationAllowed") !== false && strpos($line, "2%") !== false) {
            $lines[$i] = "              <tr><td>เงินบริจาคที่หักได้จริง (สูงสุด 2%):</td><td style=\"color:#DC2626;\">-\${formatMoney(sum.donationAllowed)} บาท</td></tr>";
            continue;
        }

        // Inspector Result Card Highlights
        if (strpos($line, "finalAmount") !== false && strpos($line, "color:#DC2626") !== false && strpos($line, "font-size:1.3rem") !== false) {
            $lines[$i] = "        ? `<strong style=\"color:#DC2626; font-size:1.3rem;\">ภาษีที่ต้องชำระเพิ่ม \${formatMoney(sum.finalAmount)} บาท</strong>`";
            continue;
        }
        if (strpos($line, "finalAmount") !== false && strpos($line, "color:#059669") !== false && strpos($line, "font-size:1.3rem") !== false) {
            $lines[$i] = "        ? `<strong style=\"color:#059669; font-size:1.3rem;\">ได้คืนภาษี \${formatMoney(sum.finalAmount)} บาท</strong>` : '<strong style=\"color:#334155; font-size:1.3rem;\">0 บาท (ไม่มีภาษีที่ต้องชำระเพิ่ม)</strong>';";
            continue;
        }
        if (strpos($line, "netTaxableIncome") !== false && strpos($line, "netTaxableProfit") !== false) {
            $lines[$i] = "            <tr><td>ฐานภาษีสุทธิ (เงินได้สุทธิ/กำไรสุทธิ):</td><td><strong>\${formatMoney(sum.netTaxableIncome || sum.netTaxableProfit)} บาท</strong></td></tr>";
            continue;
        }
        if (strpos($line, "taxPayableBeforeWht") !== false && strpos($line, "totalCorporateTax") !== false) {
            $lines[$i] = "            <tr><td>ภาษีที่คำนวณได้ตามอัตรา:</td><td>\${formatMoney(sum.taxPayableBeforeWht || sum.totalCorporateTax)} บาท</td></tr>";
            continue;
        }
        if (strpos($line, "withholdingTax") !== false && strpos($line, "totalTaxCredits") !== false) {
            $lines[$i] = "            <tr><td>เครดิตภาษีหัก ณ ที่จ่าย / ภ.ง.ด.51:</td><td style=\"color:#059669;\">-\${formatMoney(sum.withholdingTax || sum.totalTaxCredits)} บาท</td></tr>";
            continue;
        }
        if (strpos($line, "font-size:1.05rem") !== false && strpos($line, "ผลสรุป") !== false) {
            $lines[$i] = "              <td style=\"font-size:1.05rem;\"><strong>ผลสรุปสุทธิ:</strong></td>";
            continue;
        }

        // Support tickets
        if (strpos($line, "chat-admin-reply") !== false) {
            $lines[$i] = "          ? `<div class=\"chat-admin-reply\"><span class=\"reply-badge\">แอดมินตอบกลับ</span>\${t.admin_reply}</div>`";
            continue;
        }
        if (strpos($line, "ticket-count-badge all") !== false) {
            $lines[$i] = "          <span class=\"ticket-count-badge all\">ทั้งหมด \${c.total || 0}</span>";
            continue;
        }
        if (strpos($line, "ticket-count-badge pending") !== false) {
            $lines[$i] = "          <span class=\"ticket-count-badge pending\">รอดำเนินการ \${c.pending || 0}</span>";
            continue;
        }
        if (strpos($line, "ticket-count-badge inprogress") !== false) {
            $lines[$i] = "          <span class=\"ticket-count-badge inprogress\">กำลังดำเนินการ \${c.in_progress || 0}</span>";
            continue;
        }
        if (strpos($line, "ticket-count-badge resolved") !== false) {
            $lines[$i] = "          <span class=\"ticket-count-badge resolved\">เสร็จสิ้น \${c.resolved || 0}</span>`;";
            continue;
        }
        if (strpos($line, "ไม่ระบุ") !== false && strpos($line, "text-muted") !== false) {
            $lines[$i] = "          : (t.contact_name || '<span style=\"color:var(--text-muted);\">ไม่ระบุชื่อ</span>');";
            continue;
        }
        if (strpos($line, "ticket-status-badge") !== false) {
            $lines[$i] = "          <td><span class=\"ticket-status-badge \${sl.cls}\">\${sl.text}</span>\${hasReply ? ' <span style=\"font-size:0.7rem;\">💬 ตอบแล้ว</span>' : ''}</td>";
            continue;
        }
        if (strpos($line, "btn-ticket-reply") !== false || strpos($line, "ตอบกลับ") !== false && strpos($line, "<button") !== false) {
            $lines[$i] = "            <button class=\"btn btn-primary btn-sm btn-ticket-reply\" data-id=\"\${t.id}\">💬 ตอบกลับ</button>";
            continue;
        }
        if (strpos($line, "option value=\"pending\"") !== false) {
            $lines[$i] = "              <option value=\"pending\"     \${t.status==='pending'     ?'selected':''}>รอดำเนินการ</option>";
            continue;
        }
        if (strpos($line, "option value=\"in_progress\"") !== false) {
            $lines[$i] = "              <option value=\"in_progress\" \${t.status==='in_progress' ?'selected':''}>กำลังดำเนินการ</option>";
            continue;
        }
        if (strpos($line, "option value=\"resolved\"") !== false) {
            $lines[$i] = "              <option value=\"resolved\"    \${t.status==='resolved'    ?'selected':''}>เสร็จสิ้นแล้ว</option>";
            continue;
        }
        if (strpos($line, "btn-ticket-delete") !== false) {
            $lines[$i] = "            <button class=\"btn btn-danger-ghost btn-sm btn-ticket-delete\" data-id=\"\${t.id}\" title=\"ลบ\">🗑️ ลบ</button>";
            continue;
        }
        if (strpos($line, "titleEl.textContent = `") !== false && strpos($line, "Ticket #") !== false) {
            $lines[$i] = "          if (titleEl) titleEl.textContent = `ตอบกลับ Ticket #\${t.id} ของ \${t.contact_name || t.user_full_name || 'ผู้ติดต่อ'}`;";
            continue;
        }
        if (strpos($line, "confirm") !== false && strpos($line, "Ticket #") !== false) {
            $lines[$i] = "          if (!confirm(`คุณต้องการลบ Ticket #\${t.id} ใช่หรือไม่?`)) return;";
            continue;
        }
        if (strpos($line, "showToast") !== false && strpos($line, "ลบ Ticket") !== false) {
            $lines[$i] = "              showToast('🗑️ ลบ Ticket เรียบร้อยแล้ว', 'success');";
            continue;
        }
        if (strpos($line, "showToast") !== false && strpos($line, "อัปเดตสถานะ") !== false) {
            $lines[$i] = "              showToast('✅ อัปเดตสถานะสำเร็จ', 'success');";
            continue;
        }

        // Deadline Countdown
        if (strpos($line, "el.textContent = '") !== false && strpos($line, "สิ้นสุด") !== false) {
            $lines[$i] = "        el.textContent = '✅ สิ้นสุดกำหนดเวลาแล้ว';";
            continue;
        }
        if (strpos($line, "diffDays") !== false) {
            $lines[$i] = "        el.textContent = `⚠️ เหลือเวลา \${diffDays} วัน ! ใกล้สิ้นสุดกำหนด`;";
            continue;
        }
        if (strpos($line, "months") !== false && strpos($line, "days") !== false) {
            $lines[$i] = "        el.textContent = `📍 เหลือเวลา ~\${months} เดือน \${days > 0 ? days + ' วัน' : ''}`;";
            continue;
        }
        if (strpos($line, "months") !== false && strpos($line, "ประมาณ") !== false) {
            $lines[$i] = "        el.textContent = `📍 อีกประมาณ ~\${months} เดือน`;";
            continue;
        }
    }
}

$output = implode("\n", $lines);
file_put_contents($file, $output);

echo "Finished pass 2!\n";
echo "app.js isUTF8=" . (mb_check_encoding($output, 'UTF-8') ? 'YES' : 'NO') . "\n";
