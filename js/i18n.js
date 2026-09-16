/**
 * js/i18n.js
 * ระบบสลับภาษา (Internationalization: Thai & English)
 */

const I18n = (function() {
  const STORAGE_KEY = 'tax_portal_lang';

  const translations = {
    th: {
      'app_title': 'TAX PORTAL',
      'app_subtitle': 'ระบบบริการและคำนวณภาษีเงินได้บุคคลธรรมดาและนิติบุคคล e-Tax Portal',
      'nav_tax_year': 'ปีภาษี',
      'btn_theme': '🌙 ธีม',
      'btn_settings': 'ตั้งค่า',
      'btn_login': '🔑 เข้าสู่ระบบ',
      'btn_register': '📝 สมัครสมาชิก',
      'btn_logout': '🚪 ออกจากระบบ',
      'btn_profile': '👤 ข้อมูลโปรไฟล์',
      'btn_admin': '⚡ แดชบอร์ดผู้ดูแล',
      'btn_my_records': '📂 รายการที่บันทึกไว้',
      
      // Guest Notice
      'guest_notice_prefix': '💡 คำแนะนำ:',
      'guest_notice_text': 'ขณะนี้ท่านใช้งานในฐานะบุคคลทั่วไป สามารถคำนวณภาษีได้เต็มรูปแบบ หากต้องการบันทึกข้อมูลและตั้งค่าโปรไฟล์',
      'guest_notice_cta': 'กรุณาเข้าสู่ระบบหรือสมัครสมาชิก',
      'guest_admin_tip': '',

      // Hero Section
      'hero_title': 'ระบบคำนวณบัญชีและภาษีอัจฉริยะ',
      'hero_badge': 'ปีภาษี ' + (new Date().getFullYear() + 543) + ' ล่าสุด',
      'hero_desc': 'คำนวณภาษีสะดวกรวดเร็ว ระบบหักค่าใช้จ่ายเหมาให้อัตโนมัติตามกฎหมาย 100% พร้อมเชื่อมต่อฐานข้อมูลคลาวด์ Supabase และออกรายงานภาษีฉบับสมบูรณ์',
      'preset_salary': '👔 ตัวอย่าง: บุคคลธรรมดา (เงินเดือน & Thai ESG)',
      'preset_freelance': '💻 ตัวอย่าง: บุคคลธรรมดา (ฟรีแลนซ์ & กองทุน)',
      'preset_corp_sme': '🏢 ตัวอย่าง: นิติบุคคล (SME กำไร 2.8 ล้าน)',
      'preset_reset': '🔄 ล้างข้อมูลทั้งหมด',

      // Workflow Cards
      'wf_step1_title': '1. บันทึกบัญชีรายได้',
      'wf_step1_desc': 'จำแนก 8 ประเภทเงินได้ 40(1)-40(8) และรายรับนิติบุคคลอย่างเป็นระบบ',
      'wf_step2_title': '2. วิเคราะห์ต้นทุน & ลดหย่อน',
      'wf_step2_desc': 'คำนวณหักเหมา 50-60% อัตโนมัติ วางแผนภาษีด้วยกองทุนและประกันชีวิต',
      'wf_step3_title': '3. สรุปภาษี & ออกแบบพิมพ์',
      'wf_step3_desc': 'แสดงขั้นบันไดภาษี เปรียบเทียบภาษีที่ต้องชำระจริง พร้อมพิมพ์ ภ.ง.ด.',

      // Taxpayer Selector
      'taxpayer_title': '📌 คุณเป็นใคร: กรุณาเลือกประเภทผู้เสียภาษี',
      'taxpayer_ind_badge': 'บุคคลธรรมดา',
      'taxpayer_corp_badge': 'นิติบุคคล',
      'taxpayer_ind_title': 'บุคคลธรรมดา (ภ.ง.ด. 90/91)',
      'taxpayer_ind_desc': 'มนุษย์เงินเดือน, ฟรีแลนซ์, วิชาชีพอิสระ, ค้าขายส่วนบุคคล (หักค่าใช้จ่ายเหมาอัตโนมัติ 100%)',
      'taxpayer_corp_title': 'นิติบุคคล (ภ.ง.ด. 50/51)',
      'taxpayer_corp_desc': 'บริษัทจำกัด, ห้างหุ้นส่วนนิติบุคคล, ธุรกิจ SME (อัตราภาษี 0%, 15%, 20% หรือทั่วไป 20%)',

      // Wizard Steps
      'step1_title': 'เงินได้พึงประเมิน / รายรับ',
      'step1_sub': 'หักค่าใช้จ่ายอัตโนมัติ',
      'step2_title': 'ค่าลดหย่อนภาษี / รายจ่าย',
      'step2_sub': 'สิทธิประโยชน์ทางภาษี',
      'step3_title': 'สรุปผลภาษีฉบับสมบูรณ์',
      'step3_sub': 'เห็นผลสรุปทันที',

      // Actions
      'btn_next': 'ถัดไป ➔',
      'btn_back': '⬅ ย้อนกลับ',
      'btn_calc': '⚡ คำนวณภาษีทันที',
      'btn_save': '💾 บันทึกรายการนี้',
      'btn_print': '🖨️ พิมพ์แบบ ภ.ง.ด.',
      'btn_export_pdf': '📄 ส่งออก PDF',

      // Settings Modal
      'settings_title': '⚙️ การตั้งค่าระบบ (Settings)',
      'settings_tab_theme': '🎨 ธีม & หน้าจอ',
      'settings_tab_sound': '🔊 เสียงประกอบ',
      'settings_tab_lang': '🌐 ภาษา',
      'settings_tab_supabase': '☁️ Supabase ฐานข้อมูล',
      'settings_tab_backup': '💾 การจัดการข้อมูล',

      'theme_select_title': 'เลือกธีมการแสดงผล:',
      'theme_amber': '☀️ พาสเทลสีทองราชการ (เริ่มต้น)',
      'theme_dark': '🌙 ดาร์กโหมดพรีเมียม (Dark Mode)',
      'theme_navy': '🏛️ สีกรมท่าทางการ (Navy Slate)',
      'theme_emerald': '🌿 มรกตถนอมสายตา (Emerald Green)',
      'font_size_title': 'ขนาดตัวอักษรบนหน้าจอ:',
      'font_normal': 'ปกติ (100%)',
      'font_large': 'ใหญ่ (115%)',
      'font_xlarge': 'ใหญ่พิเศษ (130%)',

      'sound_toggle_title': 'เปิดใช้งานเสียงเอฟเฟกต์ (UI Audio):',
      'sound_volume_title': 'ระดับความดังเสียง:',
      'sound_pack_title': 'ชุดเสียงเอฟเฟกต์:',
      'sound_test_title': 'ทดลองฟังเสียง:',
      'btn_sound_click': 'คลิกปุ่ม',
      'btn_sound_calc': 'คำนวณภาษี',
      'btn_sound_coin': 'เงินออมภาษี',
      'btn_sound_alert': 'แจ้งเตือน',

      'lang_select_title': 'เลือกภาษาที่ใช้งาน (Select Language):',
      'lang_th': '🇹🇭 ภาษาไทย (Thai)',
      'lang_en': '🇬🇧 English (ภาษาอังกฤษ)',

      'supabase_url_label': 'Supabase Project URL:',
      'supabase_key_label': 'Supabase Anon Public Key:',
      'supabase_mode_label': 'โหมดฐานข้อมูล:',
      'mode_local': 'เฉพาะเครื่อง (Local SQLite/PHP)',
      'mode_supabase': 'คลาวด์ Supabase (Cloud)',
      'mode_hybrid': 'ไฮบริด (Auto-Sync พร้อมกัน)',
      'btn_test_supabase': '🔌 ทดสอบการเชื่อมต่อ Supabase',
      'btn_copy_schema': '📋 คัดลอก SQL Schema สำหรับ Supabase',
      'btn_sync_now': '🔄 ซิงค์ข้อมูลภาษีขึ้นคลาวด์ทันที',

      'backup_export': '📤 ส่งออกข้อมูลการคำนวณทั้งหมด (Export JSON)',
      'backup_import': '📥 นำเข้าข้อมูลการคำนวณจากไฟล์ (Import JSON)',
      'backup_reset': '⚠️ ล้างข้อมูลในแบบฟอร์มและเริ่มใหม่ทั้งหมด',

      'sim_title': '📊 แบบจำลองบัญชี-ภาษีทันใจ (Accounting Quick-Simulator)',
      'sim_desc': 'เลื่อนสไลเดอร์เพื่อดูผลกระทบของการหักค่าใช้จ่ายและวางแผนภาษีทันที',
      'sim_income_label': 'ประมาณการรายได้ทั้งปี:',
      'sim_std_tax': 'ภาษีที่ต้องเสีย (ก่อนวางแผน):',
      'sim_opt_tax': 'ภาษีที่เสียจริง (หลังวางแผน):',
      'sim_saved': 'ประหยัดภาษีได้ถึง:'
    },
    en: {
      'app_title': 'TAX PORTAL',
      'app_subtitle': 'Personal & Corporate Tax Planning and Calculation System (e-Tax Portal)',
      'nav_tax_year': 'Tax Year',
      'btn_theme': '🌙 Theme',
      'btn_settings': 'Settings',
      'btn_login': '🔑 Sign In',
      'btn_register': '📝 Register',
      'btn_logout': '🚪 Sign Out',
      'btn_profile': '👤 Profile',
      'btn_admin': '⚡ Admin Portal',
      'btn_my_records': '📂 Saved Records',

      // Guest Notice
      'guest_notice_prefix': '💡 Notice:',
      'guest_notice_text': 'You are currently using the guest session. You can calculate full taxes. To save records & profile,',
      'guest_notice_cta': 'Please sign in or create an account',
      'guest_admin_tip': '',

      // Hero Section
      'hero_title': 'Smart Accounting & Tax Calculation Engine',
      'hero_badge': 'Tax Year ' + new Date().getFullYear() + ' Latest',
      'hero_desc': 'Accurate tax computation with 100% automated statutory standard expense deductions, Supabase cloud database synchronization, and complete P.N.D. reporting.',
      'preset_salary': '👔 Demo: Individual (Salary & Thai ESG)',
      'preset_freelance': '💻 Demo: Individual (Freelance & Mutual Funds)',
      'preset_corp_sme': '🏢 Demo: Corporate (SME Profit 2.8M)',
      'preset_reset': '🔄 Reset All Inputs',

      // Workflow Cards
      'wf_step1_title': '1. Income & Revenue Bookkeeping',
      'wf_step1_desc': 'Categorize statutory 8 income types 40(1)-40(8) and corporate receipts.',
      'wf_step2_title': '2. Cost Analysis & Deductions',
      'wf_step2_desc': 'Auto 50-60% standard deductions plus smart tax allowances (Thai ESG, RMF, Life Ins.).',
      'wf_step3_title': '3. Tax Assessment & Filing',
      'wf_step3_desc': 'Progressive tax rate breakdown (0%-35% / 15%-20%) with printable P.N.D. form.',

      // Taxpayer Selector
      'taxpayer_title': '📌 Taxpayer Type: Please select your filing entity',
      'taxpayer_ind_badge': 'Individual',
      'taxpayer_corp_badge': 'Corporate',
      'taxpayer_ind_title': 'Individual Tax (P.N.D. 90/91)',
      'taxpayer_ind_desc': 'Salaried employees, freelancers, professionals, sole proprietorships (Auto 100% standard deduction).',
      'taxpayer_corp_title': 'Corporate Tax (P.N.D. 50/51)',
      'taxpayer_corp_desc': 'Co., Ltd., Registered Partnerships, SMEs (Progressive 0%, 15%, 20% or General 20%).',

      // Wizard Steps
      'step1_title': 'Assessable Income / Revenue',
      'step1_sub': 'Auto standard deduction',
      'step2_title': 'Allowances & Deductions',
      'step2_sub': 'Tax saving privileges',
      'step3_title': 'Tax Summary & Report',
      'step3_sub': 'Instant visual results',

      // Actions
      'btn_next': 'Next ➔',
      'btn_back': '⬅ Back',
      'btn_calc': '⚡ Calculate Tax Now',
      'btn_save': '💾 Save Calculation',
      'btn_print': '🖨️ Print P.N.D. Form',
      'btn_export_pdf': '📄 Export PDF',

      // Settings Modal
      'settings_title': '⚙️ System Settings',
      'settings_tab_theme': '🎨 Theme & Display',
      'settings_tab_sound': '🔊 Sound Effects',
      'settings_tab_lang': '🌐 Language',
      'settings_tab_supabase': '☁️ Supabase Cloud',
      'settings_tab_backup': '💾 Data Management',

      'theme_select_title': 'Select Visual Theme:',
      'theme_amber': '☀️ Warm Official Amber (Default)',
      'theme_dark': '🌙 Premium Dark Mode',
      'theme_navy': '🏛️ Official Navy Slate',
      'theme_emerald': '🌿 Emerald Eye-Care Green',
      'font_size_title': 'Screen Font Size Scaling:',
      'font_normal': 'Normal (100%)',
      'font_large': 'Large (115%)',
      'font_xlarge': 'Extra Large (130%)',

      'sound_toggle_title': 'Enable Sound Effects (UI Audio):',
      'sound_volume_title': 'Audio Volume:',
      'sound_pack_title': 'Sound Effect Style:',
      'sound_test_title': 'Sound Preview:',
      'btn_sound_click': 'Button Click',
      'btn_sound_calc': 'Calculation Chime',
      'btn_sound_coin': 'Tax Savings Coin',
      'btn_sound_alert': 'Warning Alert',

      'lang_select_title': 'Select Language:',
      'lang_th': '🇹🇭 ภาษาไทย (Thai)',
      'lang_en': '🇬🇧 English',

      'supabase_url_label': 'Supabase Project URL:',
      'supabase_key_label': 'Supabase Anon Public Key:',
      'supabase_mode_label': 'Database Storage Mode:',
      'mode_local': 'Local Device (SQLite/PHP)',
      'mode_supabase': 'Supabase Cloud Only',
      'mode_hybrid': 'Hybrid (Auto-Sync Both)',
      'btn_test_supabase': '🔌 Test Supabase Connection',
      'btn_copy_schema': '📋 Copy Supabase SQL Schema',
      'btn_sync_now': '🔄 Sync Tax Records to Cloud Now',

      'backup_export': '📤 Export All Records (JSON)',
      'backup_import': '📥 Import Records from File (JSON)',
      'backup_reset': '⚠️ Reset All Form Inputs & Start Over',

      'sim_title': '📊 Accounting Quick-Simulator',
      'sim_desc': 'Drag the slider to see how accounting deductions cut your actual tax liabilities.',
      'sim_income_label': 'Estimated Annual Income:',
      'sim_std_tax': 'Tax Without Planning:',
      'sim_opt_tax': 'Tax With Planning:',
      'sim_saved': 'Total Tax Saved Up To:'
    }
  };

  let currentLang = localStorage.getItem(STORAGE_KEY) || 'th';

  function getLang() {
    return currentLang;
  }

  function t(key, fallback = '') {
    if (translations[currentLang] && translations[currentLang][key]) {
      return translations[currentLang][key];
    }
    if (translations['th'] && translations['th'][key]) {
      return translations['th'][key];
    }
    return fallback || key;
  }

  function setLanguage(lang) {
    if (lang !== 'th' && lang !== 'en') lang = 'th';
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    applyLanguage();

    window.dispatchEvent(new CustomEvent('taxLanguageChanged', { detail: { lang } }));
  }

  function applyLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (translations[currentLang] && translations[currentLang][key]) {
        el.textContent = translations[currentLang][key];
      }
    });

    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      if (translations[currentLang] && translations[currentLang][key]) {
        el.innerHTML = translations[currentLang][key];
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (translations[currentLang] && translations[currentLang][key]) {
        el.setAttribute('placeholder', translations[currentLang][key]);
      }
    });
  }

  return {
    getLang,
    setLanguage,
    applyLanguage,
    t,
    translations
  };
})();

window.I18n = I18n;
