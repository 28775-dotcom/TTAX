/**
 * js/settings-ui.js
 * จัดการหน้าต่างการตั้งค่า (Settings Modal), สลับธีม 4 สี, ระบบเสียง Web Audio API,
 * ระบบภาษา TH/EN, การเชื่อมต่อ Supabase Cloud, แบบจำลองบัญชีทันใจ (Quick Simulator),
 * และระบบสำรองข้อมูล (Export/Import JSON)
 */

(function () {
  'use strict';

  // Constants & Storage Keys
  const STORAGE_THEME = 'tax_portal_theme';
  const STORAGE_FONT_SIZE = 'tax_portal_font_size';

  // Helper: Global Toast with Audio Feedback
  function notify(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (container) {
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      let icon = 'ℹ️';
      if (type === 'success') icon = '✅';
      if (type === 'error') icon = '❌';
      if (type === 'warning') icon = '⚠️';
      toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    }
    // Audio trigger
    if (window.SoundEngine) {
      if (type === 'success') SoundEngine.play('success');
      else if (type === 'error' || type === 'warning') SoundEngine.play('alert');
    }
  }

  // =========================================================================
  // 1. THEME MANAGEMENT (4 THEMES: amber, dark, navy, emerald)
  // =========================================================================
  function applyTheme(themeName) {
    const validThemes = ['amber', 'dark', 'navy', 'emerald'];
    if (!validThemes.includes(themeName)) themeName = 'amber';

    if (themeName === 'amber') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', themeName);
    }
    localStorage.setItem(STORAGE_THEME, themeName);

    // Update active state on theme card options in modal
    document.querySelectorAll('.theme-card-option[data-theme-val]').forEach(card => {
      if (card.getAttribute('data-theme-val') === themeName) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    // Update quick toggle theme button icon
    const toggleBtn = document.getElementById('btn-toggle-theme');
    if (toggleBtn) {
      toggleBtn.textContent = themeName === 'dark' || themeName === 'navy' ? '☀️' : '🌙';
    }
  }

  function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_THEME) || 'amber';
    applyTheme(savedTheme);

    // Header Quick Toggle Button
    const toggleBtn = document.getElementById('btn-toggle-theme');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const current = localStorage.getItem(STORAGE_THEME) || 'amber';
        const nextTheme = current === 'dark' ? 'amber' : 'dark';
        applyTheme(nextTheme);
        if (window.SoundEngine) SoundEngine.play('switch');
      });
    }

    // Modal Theme Cards
    document.querySelectorAll('.theme-card-option[data-theme-val]').forEach(card => {
      card.addEventListener('click', () => {
        const val = card.getAttribute('data-theme-val');
        applyTheme(val);
        if (window.SoundEngine) SoundEngine.play('switch');
      });
    });
  }

  // =========================================================================
  // 2. FONT SIZE SCALING
  // =========================================================================
  function applyFontSize(size) {
    if (size === 'normal') {
      document.documentElement.removeAttribute('data-font-size');
    } else {
      document.documentElement.setAttribute('data-font-size', size);
    }
    localStorage.setItem(STORAGE_FONT_SIZE, size);
    const select = document.getElementById('setting-font-size');
    if (select) select.value = size;
  }

  function initFontSize() {
    const savedSize = localStorage.getItem(STORAGE_FONT_SIZE) || 'normal';
    applyFontSize(savedSize);

    const select = document.getElementById('setting-font-size');
    if (select) {
      select.addEventListener('change', (e) => {
        applyFontSize(e.target.value);
        if (window.SoundEngine) SoundEngine.play('click');
      });
    }
  }

  // =========================================================================
  // 3. SOUND EFFECTS & CONTROLS
  // =========================================================================
  function initSoundControls() {
    if (!window.SoundEngine) return;
    const settings = SoundEngine.getSettings();

    const enabledCheckbox = document.getElementById('setting-sound-enabled');
    const volumeSlider = document.getElementById('setting-sound-volume');
    const volumeDisplay = document.getElementById('setting-volume-display');
    const packSelect = document.getElementById('setting-sound-pack');

    if (enabledCheckbox) {
      enabledCheckbox.checked = settings.enabled;
      enabledCheckbox.addEventListener('change', (e) => {
        SoundEngine.setEnabled(e.target.checked);
      });
    }

    if (volumeSlider) {
      volumeSlider.value = settings.volume;
      if (volumeDisplay) volumeDisplay.textContent = Math.round(settings.volume * 100) + '%';
      volumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        SoundEngine.setVolume(val);
        if (volumeDisplay) volumeDisplay.textContent = Math.round(val * 100) + '%';
      });
    }

    if (packSelect) {
      packSelect.value = settings.pack;
      packSelect.addEventListener('change', (e) => {
        SoundEngine.setSoundPack(e.target.value);
      });
    }

    // Audio Test Buttons
    document.getElementById('test-sound-click')?.addEventListener('click', () => SoundEngine.play('click'));
    document.getElementById('test-sound-calc')?.addEventListener('click', () => SoundEngine.play('calc'));
    document.getElementById('test-sound-coin')?.addEventListener('click', () => SoundEngine.play('coin'));
    document.getElementById('test-sound-alert')?.addEventListener('click', () => SoundEngine.play('alert'));

    // Global Interactive Button Click Sounds
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button, .btn, .taxpayer-type-btn, .wizard-step-btn');
      if (btn && !btn.id.startsWith('test-sound-')) {
        if (btn.classList.contains('wizard-step-btn') || btn.classList.contains('taxpayer-type-btn')) {
          SoundEngine.play('switch');
        } else {
          SoundEngine.play('click');
        }
      }
    });
  }

  // =========================================================================
  // 4. LANGUAGE (i18n) SWITCHING
  // =========================================================================
  function initLanguage() {
    if (!window.I18n) return;

    // Apply saved language on page load
    I18n.applyLanguage();

    const current = I18n.getLang();
    const radio = document.querySelector(`input[name="app_lang"][value="${current}"]`);
    if (radio) radio.checked = true;

    document.querySelectorAll('input[name="app_lang"]').forEach(input => {
      input.addEventListener('change', (e) => {
        I18n.setLanguage(e.target.value);
        if (window.SoundEngine) SoundEngine.play('switch');
      });
    });
  }

  // =========================================================================
  // 5. SETTINGS MODAL & TAB NAVIGATION
  // =========================================================================
  function openSettingsModal() {
    const modal = document.getElementById('modal-settings');
    if (!modal) return;
    modal.classList.add('open');
    modal.classList.add('active');
    if (window.SoundEngine) SoundEngine.play('modal');
  }

  function closeSettingsModal() {
    const modal = document.getElementById('modal-settings');
    if (modal) {
      modal.classList.remove('open');
      modal.classList.remove('active');
    }
  }

  function initSettingsModal() {
    // Open Button in Header
    document.getElementById('btn-open-settings')?.addEventListener('click', openSettingsModal);

    // Close Button
    const modal = document.getElementById('modal-settings');
    if (modal) {
      modal.querySelector('.modal-close-btn')?.addEventListener('click', closeSettingsModal);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeSettingsModal();
      });
    }

    // Settings Tabs switching
    const tabBtns = document.querySelectorAll('.settings-tab-btn');
    const tabPanels = document.querySelectorAll('.settings-tab-panel');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-tab');
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanels.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetPanel = document.getElementById(targetId);
        if (targetPanel) targetPanel.classList.add('active');

        if (window.SoundEngine) SoundEngine.play('switch');
      });
    });
  }

  // =========================================================================
  // 6. SUPABASE CLOUD INTEGRATION
  // =========================================================================
  function loadSupabaseSettingsToUI() {
    if (!window.SupabaseService) return;
    const config = SupabaseService.getConfig();

    const urlInput = document.getElementById('setting-supabase-url');
    const keyInput = document.getElementById('setting-supabase-key');
    const modeSelect = document.getElementById('setting-db-mode');
    const schemaCode = document.getElementById('sql-schema-code');
    const statusPill = document.getElementById('supabase-status-pill');

    if (urlInput) urlInput.value = config.url || '';
    if (keyInput) keyInput.value = config.key || '';
    if (modeSelect) modeSelect.value = config.mode || 'local';

    if (schemaCode) {
      schemaCode.textContent = SupabaseService.getSchemaSQL();
    }

    if (statusPill) {
      if (SupabaseService.isConfigured()) {
        statusPill.className = 'supabase-status-pill online';
        statusPill.textContent = '🟢 พร้อมใช้งาน (Configured)';
      } else {
        statusPill.className = 'supabase-status-pill offline';
        statusPill.textContent = '⚪ ยังไม่ระบุ URL / Key';
      }
    }
  }

  function initSupabaseHandlers() {
    if (!window.SupabaseService) return;

    // Test Connection Button
    document.getElementById('btn-test-supabase')?.addEventListener('click', async () => {
      const urlInput = document.getElementById('setting-supabase-url');
      const keyInput = document.getElementById('setting-supabase-key');
      const statusPill = document.getElementById('supabase-status-pill');

      const url = urlInput ? urlInput.value.trim() : '';
      const key = keyInput ? keyInput.value.trim() : '';

      if (statusPill) {
        statusPill.className = 'supabase-status-pill warning';
        statusPill.textContent = '⏳ กำลังทดสอบ...';
      }

      const result = await SupabaseService.testConnection(url, key);
      if (statusPill) {
        if (result.success && !result.warning) {
          statusPill.className = 'supabase-status-pill online';
          statusPill.textContent = '🟢 เชื่อมต่อแล้ว (Connected)';
        } else if (result.warning) {
          statusPill.className = 'supabase-status-pill warning';
          statusPill.textContent = '🟡 เชื่อมต่อได้ (ต้องรัน SQL)';
        } else {
          statusPill.className = 'supabase-status-pill offline';
          statusPill.textContent = '🔴 เชื่อมต่อไม่สำเร็จ';
        }
      }

      notify(result.message, result.success ? (result.warning ? 'warning' : 'success') : 'error');
    });

    // Save Configuration Button
    document.getElementById('btn-save-supabase')?.addEventListener('click', () => {
      const url = document.getElementById('setting-supabase-url')?.value || '';
      const key = document.getElementById('setting-supabase-key')?.value || '';
      const mode = document.getElementById('setting-db-mode')?.value || 'local';

      SupabaseService.saveConfig(url, key, mode);
      loadSupabaseSettingsToUI();
      notify('บันทึกการตั้งค่า Supabase เรียบร้อยแล้ว', 'success');
    });

    // Copy SQL Schema Button
    document.getElementById('btn-copy-schema')?.addEventListener('click', async () => {
      const sql = SupabaseService.getSchemaSQL();
      try {
        await navigator.clipboard.writeText(sql);
        notify('คัดลอก SQL Schema สำหรับ Supabase สำเร็จแล้ว! นำไปวางใน Supabase SQL Editor ได้ทันที', 'success');
      } catch (err) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = sql;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        notify('คัดลอก SQL Schema สำหรับ Supabase สำเร็จแล้ว!', 'success');
      }
    });

    // One-Click Cloud Sync Button
    document.getElementById('btn-sync-supabase-now')?.addEventListener('click', async () => {
      if (!SupabaseService.isConfigured()) {
        notify('กรุณากรอก Supabase Project URL และ Key และบันทึกก่อนทำการซิงค์', 'warning');
        return;
      }

      // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบหรือไม่ (ผู้ที่ไม่ได้เข้าระบบจะไม่มีการเก็บข้อมูลใดๆ)
      let loggedInUser = null;
      try {
        const raw = localStorage.getItem('tax_portal_user');
        if (raw) loggedInUser = JSON.parse(raw);
      } catch (e) {}

      if (!loggedInUser || loggedInUser.role === 'guest' || !loggedInUser.id) {
        notify('⚠️ กรุณาเข้าสู่ระบบก่อนทำการซิงค์ข้อมูล (ผู้ที่ไม่ได้เข้าสู่ระบบจะไม่สามารถบันทึกข้อมูลได้)', 'warning');
        return;
      }

      try {
        notify('กำลังซิงค์ข้อมูลกับ Supabase Cloud...', 'info');
        // Sync tax calculation draft if available
        const currentYear = document.getElementById('global-tax-year')?.value || '2567';
        const type = document.getElementById('btn-type-corporate')?.classList.contains('active') ? 'corporate' : 'individual';

        // Gather filled inputs
        const currentData = {};
        document.querySelectorAll('input[id^="inc_"], input[id^="allow_"]').forEach(inp => {
          if (inp.value && Number(inp.value) > 0) currentData[inp.id] = Number(inp.value);
        });

        await SupabaseService.saveTaxRecord({
          user_id: loggedInUser.id,
          user_name: loggedInUser.full_name || loggedInUser.username,
          title: `รายการซิงค์ภาษี (${type === 'individual' ? 'บุคคลธรรมดา' : 'นิติบุคคล'}) ปี ${currentYear}`,
          tax_year: currentYear,
          taxpayer_type: type,
          income_data: currentData,
          summary_data: {}
        });

        notify('ซิงค์ข้อมูลภาษีขึ้น Supabase Cloud สำเร็จเรียบร้อย!', 'success');
        if (window.SoundEngine) SoundEngine.play('coin');
      } catch (err) {
        notify('เกิดข้อผิดพลาดในการซิงค์: ' + err.message, 'error');
      }
    });
  }

  // =========================================================================
  // 7. INTERACTIVE QUICK ACCOUNTING SIMULATOR
  // =========================================================================
  function calculateThaiTax(taxableIncome) {
    if (taxableIncome <= 150000) return 0;
    let tax = 0;
    const brackets = [
      { min: 150000, max: 300000, rate: 0.05 },
      { min: 300000, max: 500000, rate: 0.10 },
      { min: 500000, max: 750000, rate: 0.15 },
      { min: 750000, max: 1000000, rate: 0.20 },
      { min: 1000000, max: 2000000, rate: 0.25 },
      { min: 2000000, max: 5000000, rate: 0.30 },
      { min: 5000000, max: Infinity, rate: 0.35 }
    ];

    for (const b of brackets) {
      if (taxableIncome > b.min) {
        const chunk = Math.min(taxableIncome, b.max) - b.min;
        tax += chunk * b.rate;
      }
    }
    return Math.round(tax);
  }

  function updateQuickSimulator(annualIncome) {
    const inc = Number(annualIncome) || 0;
    const displayEl = document.getElementById('quick-sim-display');
    const taxBeforeEl = document.getElementById('quick-sim-tax-before');
    const taxAfterEl = document.getElementById('quick-sim-tax-after');
    const taxSavedEl = document.getElementById('quick-sim-tax-saved');

    if (displayEl) {
      displayEl.textContent = inc.toLocaleString('th-TH') + ' บาท/ปี';
    }

    // Standard Scenario (Without smart planning: Only standard expense 50% max 100k + personal allowance 60k)
    const stdExpense = Math.min(100000, inc * 0.5);
    const stdAllowance = 60000;
    const stdTaxable = Math.max(0, inc - stdExpense - stdAllowance);
    const taxBefore = calculateThaiTax(stdTaxable);

    // Optimized Scenario (With smart accounting planning:
    // + Thai ESG 100k, RMF 100k, Life Insurance 50k, Social Security 9k)
    const optAllowances = 60000 + Math.min(100000, inc * 0.3) + Math.min(100000, inc * 0.3) + 50000 + 9000;
    const optTaxable = Math.max(0, inc - stdExpense - optAllowances);
    const taxAfter = calculateThaiTax(optTaxable);

    const saved = Math.max(0, taxBefore - taxAfter);
    const savedPct = taxBefore > 0 ? Math.round((saved / taxBefore) * 100) : 0;

    if (taxBeforeEl) taxBeforeEl.textContent = taxBefore.toLocaleString('th-TH') + ' บาท';
    if (taxAfterEl) taxAfterEl.textContent = taxAfter.toLocaleString('th-TH') + ' บาท';
    if (taxSavedEl) {
      taxSavedEl.textContent = `💰 ${saved.toLocaleString('th-TH')} บาท (${savedPct}%)`;
    }
  }

  function initQuickSimulator() {
    const slider = document.getElementById('quick-sim-slider');
    if (!slider) return;

    slider.addEventListener('input', (e) => {
      updateQuickSimulator(e.target.value);
    });

    // Run once on load
    updateQuickSimulator(slider.value);
  }

  // =========================================================================
  // 8. DATA MANAGEMENT & BACKUP (EXPORT / IMPORT / RESET)
  // =========================================================================
  function initDataManagement() {
    // Export Backup JSON
    document.getElementById('btn-export-backup')?.addEventListener('click', () => {
      const backupData = {
        exported_at: new Date().toISOString(),
        version: '2.0.0',
        settings: {
          theme: localStorage.getItem(STORAGE_THEME) || 'amber',
          lang: localStorage.getItem('tax_portal_lang') || 'th',
          fontSize: localStorage.getItem(STORAGE_FONT_SIZE) || 'normal',
          sound: window.SoundEngine ? SoundEngine.getSettings() : {}
        },
        form_data: {}
      };

      document.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.id && el.value !== '' && !el.id.includes('password') && !el.id.includes('key')) {
          backupData.form_data[el.id] = el.value;
        }
      });

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `tax_portal_backup_${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);

      notify('ส่งออกไฟล์สำรองข้อมูล JSON เรียบร้อยแล้ว', 'success');
      if (window.SoundEngine) SoundEngine.play('coin');
    });

    // Import Backup JSON
    const fileInput = document.getElementById('input-import-backup');
    document.getElementById('btn-import-backup')?.addEventListener('click', () => {
      if (fileInput) fileInput.click();
    });

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            if (data.form_data) {
              Object.keys(data.form_data).forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                  el.value = data.form_data[id];
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                }
              });
            }
            if (data.settings?.theme) applyTheme(data.settings.theme);
            if (data.settings?.lang && window.I18n) I18n.setLanguage(data.settings.lang);

            notify('นำเข้าข้อมูลสำเร็จและปรับปรุงแบบฟอร์มแล้ว', 'success');
            closeSettingsModal();
          } catch (err) {
            notify('ไฟล์ข้อมูลไม่ถูกต้อง: ' + err.message, 'error');
          }
        };
        reader.readAsText(file);
      });
    }

    // Reset Form
    document.getElementById('btn-reset-form-full')?.addEventListener('click', () => {
      if (!confirm('คำเตือน: คุณต้องการล้างข้อมูลในแบบฟอร์มทั้งหมดและเริ่มใหม่ใช่หรือไม่?')) return;

      document.querySelectorAll('input[type="number"], input[type="text"]:not(#global-tax-year)').forEach(inp => {
        inp.value = '';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      });

      notify('ล้างข้อมูลแบบฟอร์มทั้งหมดเรียบร้อยแล้ว', 'info');
      closeSettingsModal();
    });
  }

  // =========================================================================
  // INITIALIZATION ON DOM READY
  // =========================================================================
  function init() {
    initTheme();
    initFontSize();
    initSoundControls();
    initLanguage();
    initSettingsModal();
    initSupabaseHandlers();
    initQuickSimulator();
    initDataManagement();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose notify helper globally
  window.taxNotify = notify;
})();
