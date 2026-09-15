<?php
// api/auth.php - Authentication & Profile API
require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? '';
$db = getDb();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true) ?? $_POST;
    
    // สมัครสมาชิกใหม่
    if ($action === 'register') {
        $username = trim($data['username'] ?? '');
        $password = trim($data['password'] ?? '');
        $fullName = trim($data['full_name'] ?? '');
        $email = trim($data['email'] ?? '');
        $taxId = trim($data['tax_id'] ?? '');
        $companyName = trim($data['company_name'] ?? '');
        
        // อีเมลเป็นฟิลด์บังคับ
        if (empty($email)) {
            jsonResponse(['success' => false, 'message' => 'กรุณากรอกอีเมล'], 400);
        }
        
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonResponse(['success' => false, 'message' => 'รูปแบบอีเมลไม่ถูกต้อง'], 400);
        }
        
        if (empty($password) || empty($fullName)) {
            jsonResponse(['success' => false, 'message' => 'กรุณากรอกรหัสผ่าน และชื่อ-นามสกุล ให้ครบถ้วน'], 400);
        }
        
        // ใช้ email เป็น username ถ้าไม่ได้ระบุ
        if (empty($username)) {
            $username = $email;
        }
        
        if (strlen($password) < 6) {
            jsonResponse(['success' => false, 'message' => 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'], 400);
        }
        
        // ตรวจสอบอีเมลซ้ำ (1 อีเมล = 1 บัญชี)
        $emailCheck = $db->prepare("SELECT id FROM users WHERE email = ?");
        $emailCheck->execute([$email]);
        if ($emailCheck->fetch()) {
            jsonResponse(['success' => false, 'message' => 'อีเมลนี้มีอยู่ในระบบแล้ว กรุณาเข้าสู่ระบบแทน'], 409);
        }
        
        $stmt = $db->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            jsonResponse(['success' => false, 'message' => 'อีเมลนี้มีอยู่ในระบบแล้ว กรุณาเข้าสู่ระบบแทน'], 409);
        }
        
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $insert = $db->prepare("
            INSERT INTO users (username, password_hash, full_name, email, tax_id, company_name, role) 
            VALUES (?, ?, ?, ?, ?, ?, 'member')
        ");
        $insert->execute([$username, $passwordHash, $fullName, $email, $taxId, $companyName]);
        $newId = $db->lastInsertId();
        
        $_SESSION['user_id'] = $newId;
        
        $user = getCurrentUser();
        jsonResponse([
            'success' => true,
            'message' => 'สมัครสมาชิกและเข้าสู่ระบบสำเร็จ',
            'user' => $user
        ]);
    }
    
    // เข้าสู่ระบบ (รองรับทั้ง email และ username)
    if ($action === 'login') {
        $loginId = trim($data['username'] ?? $data['email'] ?? '');
        $password = trim($data['password'] ?? '');
        
        if (empty($loginId) || empty($password)) {
            jsonResponse(['success' => false, 'message' => 'กรุณากรอกอีเมลและรหัสผ่าน'], 400);
        }
        
        // ค้นหาทั้ง email และ username
        $stmt = $db->prepare("SELECT id, username, password_hash FROM users WHERE email = ? OR username = ?");
        $stmt->execute([$loginId, $loginId]);
        $user = $stmt->fetch();
        
        if (!$user || !password_verify($password, $user['password_hash'])) {
            jsonResponse(['success' => false, 'message' => 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'], 401);
        }
        
        $_SESSION['user_id'] = $user['id'];
        $currentUser = getCurrentUser();
        
        jsonResponse([
            'success' => true,
            'message' => 'เข้าสู่ระบบสำเร็จ',
            'user' => $currentUser
        ]);
    }

    // อัปเดตโปรไฟล์และรูปภาพของสมาชิก
    if ($action === 'update_profile') {
        $user = getCurrentUser();
        if (!$user) {
            jsonResponse(['success' => false, 'message' => 'กรุณาเข้าสู่ระบบก่อนทำรายการ'], 401);
        }

        $fullName = trim($data['full_name'] ?? $user['full_name']);
        $email = trim($data['email'] ?? $user['email']);
        $taxId = trim($data['tax_id'] ?? $user['tax_id']);
        $phone = trim($data['phone'] ?? $user['phone']);
        $address = trim($data['address'] ?? $user['address']);
        $companyName = trim($data['company_name'] ?? $user['company_name']);
        $profilePic = $data['profile_pic'] ?? $user['profile_pic'];

        if (empty($fullName)) {
            jsonResponse(['success' => false, 'message' => 'ชื่อ-นามสกุลไม่สามารถเว้นว่างได้'], 400);
        }

        $stmt = $db->prepare("
            UPDATE users 
            SET full_name = ?, email = ?, tax_id = ?, phone = ?, address = ?, company_name = ?, profile_pic = ? 
            WHERE id = ?
        ");
        $stmt->execute([$fullName, $email, $taxId, $phone, $address, $companyName, $profilePic, $user['id']]);

        $updatedUser = getCurrentUser();
        jsonResponse([
            'success' => true,
            'message' => 'บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว',
            'user' => $updatedUser
        ]);
    }
    
    // ออกจากระบบ
    if ($action === 'logout') {
        $_SESSION = [];
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        session_destroy();
        jsonResponse(['success' => true, 'message' => 'ออกจากระบบเรียบร้อยแล้ว']);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'me') {
        $user = getCurrentUser();
        if ($user) {
            jsonResponse(['logged_in' => true, 'user' => $user]);
        } else {
            jsonResponse(['logged_in' => false, 'user' => null]);
        }
    }
}

jsonResponse(['success' => false, 'message' => 'คำขอไม่ถูกต้อง'], 400);
