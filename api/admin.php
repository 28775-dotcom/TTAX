<?php
// api/admin.php - Admin Portal & Member Management API
require_once __DIR__ . '/db.php';

$user = getCurrentUser();
$db = getDb();

// ตรวจสอบสิทธิ์ผู้ดูแลระบบ (Admin Only)
if (!$user || $user['role'] !== 'admin') {
    jsonResponse(['success' => false, 'message' => 'ปฏิเสธการเข้าถึง: คุณไม่มีสิทธิ์ผู้ดูแลระบบ'], 403);
}

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // สถิติภาพรวมระบบสำหรับผู้ดูแลระบบ
    if ($action === 'stats') {
        $totalUsers = (int)$db->query("SELECT COUNT(*) FROM users")->fetchColumn();
        $totalMembers = (int)$db->query("SELECT COUNT(*) FROM users WHERE role = 'member'")->fetchColumn();
        $totalAdmins = (int)$db->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
        $totalRecords = (int)$db->query("SELECT COUNT(*) FROM tax_records")->fetchColumn();
        
        // วิเคราะห์สัดส่วนบุคคลธรรมดา vs นิติบุคคลจากฐานข้อมูล
        $records = $db->query("SELECT summary_data FROM tax_records")->fetchAll();
        $indCount = 0;
        $corpCount = 0;
        $totalTaxCalculated = 0;

        foreach ($records as $r) {
            $sum = json_decode($r['summary_data'], true);
            if (!empty($sum['taxpayerType']) && $sum['taxpayerType'] === 'corporate') {
                $corpCount++;
                $totalTaxCalculated += ($sum['totalCorporateTax'] ?? 0);
            } else {
                $indCount++;
                $totalTaxCalculated += ($sum['taxPayableBeforeWht'] ?? 0);
            }
        }

        // ผู้ใช้งานล่าสุด 5 คน
        $recentUsers = $db->query("
            SELECT id, username, full_name, role, created_at, profile_pic 
            FROM users 
            ORDER BY created_at DESC 
            LIMIT 5
        ")->fetchAll();

        // นับจำนวนเรื่องร้องเรียนที่รอดำเนินการ (Pending Support Tickets)
        $pendingTickets = 0;
        try {
            $pendingTickets = (int)$db->query("SELECT COUNT(*) FROM support_tickets WHERE status = 'pending'")->fetchColumn();
        } catch (Exception $e) {
            $pendingTickets = 0;
        }

        jsonResponse([
            'success' => true,
            'stats' => [
                'total_users' => $totalUsers,
                'total_members' => $totalMembers,
                'total_admins' => $totalAdmins,
                'total_records' => $totalRecords,
                'individual_records' => $indCount,
                'corporate_records' => $corpCount,
                'total_tax_calculated' => $totalTaxCalculated,
                'pending_tickets' => $pendingTickets,
                'recent_users' => $recentUsers
            ]
        ]);
    }

    // รายชื่อสมาชิกทั้งหมดในระบบ
    if ($action === 'members_list') {
        $search = trim($_GET['search'] ?? '');
        $sql = "
            SELECT u.id, u.username, u.full_name, u.email, u.tax_id, u.phone, u.company_name, u.role, u.profile_pic, u.created_at,
                   COUNT(t.id) AS records_count
            FROM users u
            LEFT JOIN tax_records t ON u.id = t.user_id
        ";
        
        $params = [];
        if (!empty($search)) {
            $sql .= " WHERE u.username LIKE ? OR u.full_name LIKE ? OR u.email LIKE ? OR u.tax_id LIKE ?";
            $term = "%$search%";
            $params = [$term, $term, $term, $term];
        }

        $sql .= " GROUP BY u.id ORDER BY u.created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $members = $stmt->fetchAll();

        jsonResponse(['success' => true, 'members' => $members]);
    }

    // ประวัติการคำนวณภาษีของสมาชิกที่เลือก
    if ($action === 'member_records') {
        $userId = (int)($_GET['user_id'] ?? 0);
        $userStmt = $db->prepare("SELECT id, username, full_name, email, tax_id, company_name, profile_pic FROM users WHERE id = ?");
        $userStmt->execute([$userId]);
        $targetMember = $userStmt->fetch();

        if (!$targetMember) {
            jsonResponse(['success' => false, 'message' => 'ไม่พบข้อมูลสมาชิกรายนี้'], 404);
        }

        $recStmt = $db->prepare("
            SELECT id, title, tax_year, summary_data, created_at, updated_at 
            FROM tax_records 
            WHERE user_id = ? 
            ORDER BY updated_at DESC
        ");
        $recStmt->execute([$userId]);
        $rows = $recStmt->fetchAll();

        $records = array_map(function($r) {
            return [
                'id' => (int)$r['id'],
                'title' => $r['title'],
                'tax_year' => $r['tax_year'],
                'summary' => json_decode($r['summary_data'], true),
                'created_at' => $r['created_at'],
                'updated_at' => $r['updated_at']
            ];
        }, $rows);

        jsonResponse([
            'success' => true,
            'member' => $targetMember,
            'records' => $records
        ]);
    }

    // ดูรายละเอียดแบบคำนวณภาษีฉบับเต็มของสมาชิก (Admin Inspector)
    if ($action === 'record_detail') {
        $recordId = (int)($_GET['id'] ?? 0);
        $stmt = $db->prepare("
            SELECT t.*, u.username, u.full_name, u.tax_id as user_tax_id, u.company_name as user_company
            FROM tax_records t
            JOIN users u ON t.user_id = u.id
            WHERE t.id = ?
        ");
        $stmt->execute([$recordId]);
        $rec = $stmt->fetch();

        if (!$rec) {
            jsonResponse(['success' => false, 'message' => 'ไม่พบแบบภาษีที่ต้องการ'], 404);
        }

        jsonResponse([
            'success' => true,
            'record' => [
                'id' => (int)$rec['id'],
                'user_id' => (int)$rec['user_id'],
                'username' => $rec['username'],
                'full_name' => $rec['full_name'],
                'user_tax_id' => $rec['user_tax_id'],
                'user_company' => $rec['user_company'],
                'title' => $rec['title'],
                'tax_year' => $rec['tax_year'],
                'income_data' => json_decode($rec['income_data'], true),
                'expense_data' => json_decode($rec['expense_data'], true),
                'allowance_data' => json_decode($rec['allowance_data'], true),
                'summary_data' => json_decode($rec['summary_data'], true),
                'created_at' => $rec['created_at'],
                'updated_at' => $rec['updated_at']
            ]
        ]);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true) ?? $_POST;

    // ลบสมาชิก
    if ($action === 'delete_member') {
        $targetId = (int)($data['user_id'] ?? ($_GET['user_id'] ?? 0));
        if ($targetId === (int)$user['id']) {
            jsonResponse(['success' => false, 'message' => 'ไม่อนุญาตให้ลบบัญชีผู้ดูแลระบบของตนเอง'], 400);
        }

        $stmt = $db->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$targetId]);

        if ($stmt->rowCount() > 0) {
            jsonResponse(['success' => true, 'message' => 'ลบสมาชิกและข้อมูลที่เกี่ยวข้องเรียบร้อยแล้ว']);
        } else {
            jsonResponse(['success' => false, 'message' => 'ไม่พบสมาชิกที่ต้องการลบ'], 404);
        }
    }

    // เปลี่ยนบทบาทสมาชิก (Admin <-> Member)
    if ($action === 'toggle_role') {
        $targetId = (int)($data['user_id'] ?? ($_GET['user_id'] ?? 0));
        if ($targetId === (int)$user['id']) {
            jsonResponse(['success' => false, 'message' => 'ไม่อนุญาตให้แก้ไขสิทธิ์บัญชีตนเอง'], 400);
        }

        $stmt = $db->prepare("SELECT role FROM users WHERE id = ?");
        $stmt->execute([$targetId]);
        $targetRole = $stmt->fetchColumn();

        if (!$targetRole) {
            jsonResponse(['success' => false, 'message' => 'ไม่พบสมาชิก'], 404);
        }

        $newRole = $targetRole === 'admin' ? 'member' : 'admin';
        $update = $db->prepare("UPDATE users SET role = ? WHERE id = ?");
        $update->execute([$newRole, $targetId]);

        jsonResponse([
            'success' => true,
            'message' => "ปรับสถานะเป็น '$newRole' เรียบร้อยแล้ว",
            'new_role' => $newRole
        ]);
    }
}

jsonResponse(['success' => false, 'message' => 'คำขอไม่ถูกต้อง'], 400);
