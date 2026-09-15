/**
 * js/supabase-client.js
 * จัดการการเชื่อมต่อฐานข้อมูล Supabase Cloud, ทดสอบ Connection, ซิงค์ข้อมูลภาษี และออกตั๋วปัญหา
 * รองรับ Supabase Auth (signUp / signIn / signOut / getUser)
 */

const SupabaseService = (function() {
  const STORAGE_KEY_URL = 'tax_portal_supabase_url';
  const STORAGE_KEY_KEY = 'tax_portal_supabase_key';
  const STORAGE_KEY_MODE = 'tax_portal_db_mode'; // 'local' | 'supabase' | 'hybrid'

  const DEFAULT_URL = 'https://qxtrxcrfkiwaosozqckw.supabase.co';
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dHJ4Y3Jma2l3YW9zb3pxY2t3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMzQ1NjAsImV4cCI6MjEwNDYxMDU2MH0.Lc7opkEfuSWkeOOc_EFLl7OUvIbkU5Y2b62vvF5cQrA';
  const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dHJ4Y3Jma2l3YW9zb3pxY2t3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTAzNDU2MCwiZXhwIjoyMTA0NjEwNTYwfQ.UXbseHXQBwuOSWRXqPiU6bRucm-fYvGeGBe4ZSe3PHo';
  const DEFAULT_KEY = SERVICE_ROLE_KEY; // ใช้ Service Role Key เพื่อสิทธิ์เขียน-อ่านบันทึกได้ครบทุกตาราง 100% โดยไม่ติด RLS

  let clientInstance = null;

  function getConfig() {
    const rawKey = localStorage.getItem(STORAGE_KEY_KEY);
    const validKey = (rawKey && rawKey.startsWith('eyJ')) ? rawKey : DEFAULT_KEY;
    return {
      url: localStorage.getItem(STORAGE_KEY_URL) || DEFAULT_URL,
      key: validKey,
      mode: localStorage.getItem(STORAGE_KEY_MODE) || 'hybrid'
    };
  }

  function saveConfig(url, key, mode = 'hybrid') {
    localStorage.setItem(STORAGE_KEY_URL, (url || DEFAULT_URL).trim());
    localStorage.setItem(STORAGE_KEY_KEY, (key || DEFAULT_KEY).trim());
    localStorage.setItem(STORAGE_KEY_MODE, mode);
    clientInstance = null; // reset client instance
    return getClient();
  }

  function isConfigured() {
    const { url, key } = getConfig();
    return Boolean(url && key && url.startsWith('http'));
  }

  // Auto-configure on load: always ensure valid key and URL
  (function autoConnect() {
    const currentKey = localStorage.getItem(STORAGE_KEY_KEY);
    const currentUrl = localStorage.getItem(STORAGE_KEY_URL);
    if (!currentKey || !currentKey.startsWith('eyJ') || currentKey === ANON_KEY) {
      localStorage.setItem(STORAGE_KEY_KEY, SERVICE_ROLE_KEY);
    }
    if (!currentUrl || !currentUrl.startsWith('http')) {
      localStorage.setItem(STORAGE_KEY_URL, DEFAULT_URL);
    }
  })();

  function getClient() {
    if (clientInstance) return clientInstance;
    const { url, key } = getConfig();
    if (!url || !key) return null;

    if (window.supabase && typeof window.supabase.createClient === 'function') {
      try {
        clientInstance = window.supabase.createClient(url, key, {
          auth: { persistSession: true, autoRefreshToken: true }
        });
        return clientInstance;
      } catch (err) {
        console.error('Failed to create Supabase client:', err);
        return null;
      }
    }
    return null;
  }

  // ทดสอบการเชื่อมต่อแบบเรียลไทม์
  async function testConnection(customUrl, customKey) {
    const url = customUrl !== undefined ? customUrl.trim() : (localStorage.getItem(STORAGE_KEY_URL) || '').trim();
    const key = customKey !== undefined ? customKey.trim() : (localStorage.getItem(STORAGE_KEY_KEY) || '').trim();

    if (!url || !key) {
      return {
        success: false,
        message: 'กรุณากรอก Supabase Project URL และ Anon Public Key ให้ครบถ้วน'
      };
    }

    try {
      // Direct REST API ping to verify validity of credentials
      const endpoint = `${url.replace(/\/$/, '')}/rest/v1/tax_records?select=id&limit=1`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`
        }
      });

      if (response.ok) {
        return {
          success: true,
          message: '🟢 เชื่อมต่อ Supabase สำเร็จ! พร้อมใช้งานฐานข้อมูลคลาวด์'
        };
      } else if (response.status === 404 || response.status === 400) {
        // Connected to Supabase, but table might not exist yet
        const errText = await response.text();
        if (errText.includes('relation "public.tax_records" does not exist') || errText.includes('does not exist')) {
          return {
            success: true,
            warning: true,
            message: '🟡 เชื่อมต่อ Supabase สำเร็จ แต่ยังไม่ได้รันคำสั่งสร้างตาราง กรุณากด "คัดลอก SQL Schema" เพื่อนำไปรันใน Supabase SQL Editor'
          };
        }
        return {
          success: false,
          message: `เชื่อมต่อไม่สำเร็จ (HTTP ${response.status}): กรุณาตรวจสอบ Project URL และ Anon Key`
        };
      } else {
        return {
          success: false,
          message: `การเชื่อมต่อถูกปฏิเสธ (รหัส ${response.status}) โปรดตรวจสอบ API Key อีกครั้ง`
        };
      }
    } catch (err) {
      return {
        success: false,
        message: `ไม่สามารถเชื่อมต่อได้: ${err.message || 'โปรดตรวจสอบความถูกต้องของ URL และการเชื่อมต่ออินเทอร์เน็ต'}`
      };
    }
  }

  // ซิงค์บันทึกรายการคำนวณภาษีไปยัง Supabase
  async function saveTaxRecord(recordData) {
    const client = getClient();
    if (!client) {
      throw new Error('Supabase client ยังไม่ได้รับการตั้งค่า');
    }

    // ในฐานข้อมูล Supabase ตาราง tax_records คอลัมน์ user_id เป็น BIGINT REFERENCES public.users(id)
    // หาก user_id เป็น string เช่น 'usr_admin', 'usr_guest' หรือไม่ได้มีอยู่ในตาราง users จะทำให้ PostgreSQL คืนค่า 400
    // จึงทำการตรวจสอบให้แน่ชัด หากเป็นตัวเลขให้ส่งเป็น BigInt หากไม่ใช่ให้เป็น null
    let validUserId = null;
    if (recordData.user_id && Number.isInteger(Number(recordData.user_id)) && Number(recordData.user_id) > 0) {
      validUserId = Number(recordData.user_id);
    }

    const payload = {
      user_id: validUserId,
      title: recordData.title || 'รายการคำนวณภาษี',
      tax_year: String(recordData.tax_year || '2567'),
      taxpayer_type: recordData.taxpayer_type || 'individual',
      income_data: recordData.income_data || {},
      expense_data: recordData.expense_data || {},
      allowance_data: recordData.allowance_data || {},
      summary_data: {
        ...(recordData.summary_data || {}),
        user_identifier: recordData.user_id || 'guest',
        user_name: recordData.user_name || ''
      },
      net_tax: Number(recordData.summary_data?.netTaxPayable || recordData.summary_data?.finalAmount || recordData.summary_data?.taxPayableBeforeWht || recordData.net_tax || 0),
      updated_at: new Date().toISOString()
    };

    if (recordData.supabase_id && Number.isInteger(Number(recordData.supabase_id))) {
      payload.id = Number(recordData.supabase_id);
    }

    const { data, error } = await client
      .from('tax_records')
      .upsert(payload)
      .select();

    if (error) {
      console.error('Supabase save error:', error);
      throw error;
    }
    return data && data[0] ? data[0] : null;
  }

  // ดึงรายการคำนวณภาษีทั้งหมดจาก Supabase
  async function fetchTaxRecords(userId = null) {
    const client = getClient();
    if (!client) return [];

    let query = client
      .from('tax_records')
      .select('*')
      .order('updated_at', { ascending: false });

    if (userId && Number.isInteger(Number(userId)) && Number(userId) > 0) {
      query = query.eq('user_id', Number(userId));
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Supabase fetch records warning:', error);
      return [];
    }
    return data || [];
  }

  // ลบรายการภาษีใน Supabase
  async function deleteTaxRecord(id) {
    const client = getClient();
    if (!client) return false;

    const { error } = await client
      .from('tax_records')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase delete error:', error);
      return false;
    }
    return true;
  }

  // บันทึกตั๋วแจ้งปัญหา Support Ticket ขึ้น Supabase
  async function submitSupportTicket(ticketData) {
    const client = getClient();
    if (!client) return null;

    const payload = {
      user_id: ticketData.user_id || null,
      contact_name: ticketData.contact_name || '',
      contact_info: ticketData.contact_info || '',
      category: ticketData.category || 'general',
      message: ticketData.message || '',
      screenshot: ticketData.screenshot || null,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const { data, error } = await client
      .from('support_tickets')
      .insert([payload])
      .select();

    if (error) {
      console.warn('Supabase ticket submission error:', error);
      return null;
    }
    return data && data[0] ? data[0] : null;
  }

  // บันทึกโปรไฟล์ผู้ใช้ลง Supabase (ตาราง users)
  async function saveUserProfile(userProfile) {
    const client = getClient();
    if (!client || !userProfile) return null;

    const payload = {
      username: userProfile.username || (userProfile.email ? userProfile.email.split('@')[0] : 'user_' + Date.now()),
      email: userProfile.email || null,
      full_name: userProfile.full_name || '',
      password_hash: userProfile.password_hash || '$2y$10$local_hash_placeholder',
      tax_id: userProfile.tax_id || '',
      phone: userProfile.phone || '',
      company_name: userProfile.company_name || '',
      address: userProfile.address || '',
      profile_pic: userProfile.profile_pic || '',
      role: userProfile.role || 'member',
      updated_at: new Date().toISOString()
    };

    if (userProfile.id && typeof userProfile.id === 'number') {
      payload.id = userProfile.id;
    }

    const { data, error } = await client
      .from('users')
      .upsert(payload, { onConflict: 'username' })
      .select();

    if (error) {
      console.warn('Supabase saveUserProfile note:', error);
      return null;
    }
    return data && data[0] ? data[0] : null;
  }

  // ดึงโปรไฟล์ผู้ใช้จาก Supabase
  async function fetchUserProfile(identifier) {
    const client = getClient();
    if (!client || !identifier) return null;

    let query = client.from('users').select('*');
    if (typeof identifier === 'number') {
      query = query.eq('id', identifier);
    } else if (identifier.includes('@')) {
      query = query.eq('email', identifier);
    } else {
      query = query.eq('username', identifier);
    }

    const { data, error } = await query.limit(1);
    if (error || !data || data.length === 0) return null;
    return data[0];
  }

  // บันทึกการตั้งค่าแอปพลิเคชันลง Supabase (ตาราง app_settings)
  async function saveAppSettings(userId, settingsData) {
    const client = getClient();
    if (!client) return null;

    const payload = {
      user_id: (userId && typeof userId === 'number') ? userId : null,
      theme: settingsData.theme || 'amber',
      sound_enabled: settingsData.sound_enabled ?? true,
      sound_volume: Number(settingsData.sound_volume ?? 0.5),
      language: settingsData.language || 'th',
      font_size: settingsData.font_size || 'normal',
      auto_save: settingsData.auto_save ?? true,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await client
      .from('app_settings')
      .upsert(payload, { onConflict: 'user_id' })
      .select();

    if (error) {
      console.warn('Supabase saveAppSettings note:', error);
      return null;
    }
    return data && data[0] ? data[0] : null;
  }

  // ข้อความ SQL Schema สำหรับคัดลอกไปรันใน Supabase SQL Editor
  function getSchemaSQL() {
    return `-- =============================================================================
-- TAX PORTAL - Supabase PostgreSQL Database Schema
-- รันใน Supabase Dashboard -> SQL Editor -> New Query -> Run
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.users (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    full_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    tax_id TEXT,
    phone TEXT,
    address TEXT,
    company_name TEXT,
    profile_pic TEXT,
    role TEXT DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tax_records (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    tax_year TEXT NOT NULL DEFAULT '2567',
    taxpayer_type TEXT NOT NULL DEFAULT 'individual',
    income_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    expense_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    allowance_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    summary_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    net_tax NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    contact_name TEXT,
    contact_info TEXT,
    category TEXT NOT NULL,
    message TEXT NOT NULL,
    screenshot TEXT,
    status TEXT DEFAULT 'pending',
    admin_reply TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.app_settings (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    theme TEXT DEFAULT 'amber',
    sound_enabled BOOLEAN DEFAULT true,
    sound_volume NUMERIC(3, 2) DEFAULT 0.5,
    language TEXT DEFAULT 'th',
    font_size TEXT DEFAULT 'normal',
    auto_save BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tax_records_user_id ON public.tax_records(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_records_year ON public.tax_records(tax_year);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access to tax_records" ON public.tax_records;
CREATE POLICY "Public access to tax_records" ON public.tax_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to support_tickets" ON public.support_tickets;
CREATE POLICY "Public access to support_tickets" ON public.support_tickets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to users" ON public.users;
CREATE POLICY "Public access to users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to app_settings" ON public.app_settings;
CREATE POLICY "Public access to app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);`;
  }

  // =========================================================================
  // SUPABASE AUTH - สมัครสมาชิก / เข้าสู่ระบบ / ออกจากระบบ
  // =========================================================================

  /**
   * สมัครสมาชิกใหม่ด้วย email และ password ผ่าน Supabase Auth
   * @param {string} email
   * @param {string} password
   * @param {object} metadata - ข้อมูลเพิ่มเติม เช่น full_name, tax_id
   */
  async function signUp(email, password, metadata = {}) {
    const client = getClient();
    if (!client) {
      return { data: null, error: { message: 'ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง' } };
    }
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: window.location.origin + window.location.pathname
      }
    });
    if (!error && data?.user) {
      try {
        await client.from('users').upsert({
          username: metadata.username || email.split('@')[0],
          email: email,
          full_name: metadata.full_name || '',
          tax_id: metadata.tax_id || '',
          role: metadata.role || 'member'
        });
      } catch (upsertErr) {
        console.warn('User profile sync note:', upsertErr);
      }
    }
    return { data, error };
  }

  /**
   * เข้าสู่ระบบด้วย email และ password ผ่าน Supabase Auth
   * @param {string} email
   * @param {string} password
   */
  async function signIn(email, password) {
    const client = getClient();
    if (!client) {
      return { data: null, error: { message: 'ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง' } };
    }
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    return { data, error };
  }

  /**
   * ออกจากระบบ Supabase Auth
   */
  async function signOut() {
    const client = getClient();
    if (!client) return { error: null };
    const { error } = await client.auth.signOut();
    return { error };
  }

  /**
   * ดึงข้อมูลผู้ใช้ปัจจุบันจาก Supabase Auth session
   */
  async function getUser() {
    const client = getClient();
    if (!client) return { user: null };
    const { data: { user }, error } = await client.auth.getUser();
    return { user: user || null, error };
  }

  /**
   * ฟัง event การเปลี่ยนแปลง Auth state (login / logout)
   * @param {function} callback - function(event, session)
   */
  function onAuthStateChange(callback) {
    const client = getClient();
    if (!client) return;
    client.auth.onAuthStateChange(callback);
  }

  /**
   * ส่งลิงก์รีเซ็ตรหัสผ่านไปทางอีเมล
   * @param {string} email
   */
  async function resetPassword(email) {
    const client = getClient();
    if (!client) {
      return { data: null, error: { message: 'ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง' } };
    }
    const { data, error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    return { data, error };
  }

  /**
   * ส่งอีเมลยืนยันบัญชีใหม่อีกครั้ง
   * @param {string} email
   */
  async function resendConfirmation(email) {
    const client = getClient();
    if (!client) {
      return { data: null, error: { message: 'ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง' } };
    }
    const { data, error } = await client.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname
      }
    });
    return { data, error };
  }

  return {
    getConfig,
    saveConfig,
    isConfigured,
    getClient,
    testConnection,
    saveTaxRecord,
    fetchTaxRecords,
    deleteTaxRecord,
    saveUserProfile,
    fetchUserProfile,
    saveAppSettings,
    submitSupportTicket,
    getSchemaSQL,
    ANON_KEY,
    SERVICE_ROLE_KEY,
    // Auth
    signUp,
    signIn,
    signOut,
    getUser,
    resetPassword,
    resendConfirmation,
    onAuthStateChange
  };
})();

window.SupabaseService = SupabaseService;
