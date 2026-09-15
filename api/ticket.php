<?php
// api/ticket.php - Support Tickets & Contact Admin API
require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? '';
$user = getCurrentUser();
$db = getDb();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true) ?? $_POST;

    // ส่งข้อร้องเรียน / แจ้งปัญหา / ข้อสอบถาม
    if ($action === 'create') {
        $category = trim($data['category'] ?? 'calculation_issue');
        $message = trim($data['message'] ?? '');
        $contactName = trim($data['contact_name'] ?? '');
        $contactInfo = trim($data['contact_info'] ?? '');
        $screenshot = $data['screenshot'] ?? null;

        if (empty($message)) {
            jsonResponse(['success' => false, 'message' => 'กรุณาระบุรายละเอียดข้อความปัญหาหรือคำถาม'], 400);
        }

        $userId = $user ? $user['id'] : null;
        if ($user) {
            if (empty($contactName)) $contactName = $user['full_name'];
            if (empty($contactInfo)) $contactInfo = $user['email'] ?: $user['phone'] ?: $user['username'];
        }

        $stmt = $db->prepare("
            INSERT INTO support_tickets (user_id, contact_name, contact_info, category, message, screenshot, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')
        ");
        $stmt->execute([$userId, $contactName, $contactInfo, $category, $message, $screenshot]);
        $newId = (int)$db->lastInsertId();

        jsonResponse([
            'success' => true,
            'ticket_id' => $newId,
            'message' => 'ส่งข้อความแจ้งปัญหา/สอบถามถึงผู้ดูแลระบบเรียบร้อยแล้ว แอดมินจะดำเนินการตรวจสอบโดยเร็วที่สุด'
        ]);
    }

    // แอดมิน: อัปเดตสถานะของ Ticket
    if ($action === 'update_status') {
        if (!$user || $user['role'] !== 'admin') {
            jsonResponse(['success' => false, 'message' => 'ไม่มีสิทธิ์เข้าถึง (Admin Only)'], 403);
        }

        $ticketId = (int)($data['ticket_id'] ?? 0);
        $status = trim($data['status'] ?? 'pending');
        $allowedStatuses = ['pending', 'in_progress', 'resolved'];

        if (!in_array($status, $allowedStatuses)) {
            jsonResponse(['success' => false, 'message' => 'สถานะไม่ถูกต้อง'], 400);
        }

        $stmt = $db->prepare("UPDATE support_tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $stmt->execute([$status, $ticketId]);

        jsonResponse(['success' => true, 'message' => 'อัปเดตสถานะเรียบร้อยแล้ว']);
    }

    // แอดมิน: พิมพ์ตอบกลับ Ticket
    if ($action === 'reply') {
        if (!$user || $user['role'] !== 'admin') {
            jsonResponse(['success' => false, 'message' => 'ไม่มีสิทธิ์เข้าถึง (Admin Only)'], 403);
        }

        $ticketId = (int)($data['ticket_id'] ?? 0);
        $adminReply = trim($data['admin_reply'] ?? '');
        $newStatus = trim($data['status'] ?? 'resolved');

        if (empty($adminReply)) {
            jsonResponse(['success' => false, 'message' => 'กรุณาระบุข้อความตอบกลับ'], 400);
        }

        $stmt = $db->prepare("
            UPDATE support_tickets 
            SET admin_reply = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        ");
        $stmt->execute([$adminReply, $newStatus, $ticketId]);

        jsonResponse(['success' => true, 'message' => 'บันทึกคำตอบกลับและปรับปรุงสถานะเรียบร้อยแล้ว']);
    }

    // แอดมิน: ลบ Ticket
    if ($action === 'delete') {
        if (!$user || $user['role'] !== 'admin') {
            jsonResponse(['success' => false, 'message' => 'ไม่มีสิทธิ์เข้าถึง (Admin Only)'], 403);
        }

        $ticketId = (int)($data['ticket_id'] ?? 0);
        $stmt = $db->prepare("DELETE FROM support_tickets WHERE id = ?");
        $stmt->execute([$ticketId]);

        jsonResponse(['success' => true, 'message' => 'ลบรายการเรียบร้อยแล้ว']);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // แอดมิน: ดึงรายการข้อร้องเรียนทั้งหมด
    if ($action === 'list') {
        if (!$user || $user['role'] !== 'admin') {
            jsonResponse(['success' => false, 'message' => 'ไม่มีสิทธิ์เข้าถึง (Admin Only)'], 403);
        }

        $statusFilter = trim($_GET['status'] ?? 'all');
        $sql = "
            SELECT t.*, u.username, u.full_name as user_full_name, u.email as user_email
            FROM support_tickets t
            LEFT JOIN users u ON t.user_id = u.id
        ";

        $params = [];
        if ($statusFilter !== 'all' && in_array($statusFilter, ['pending', 'in_progress', 'resolved'])) {
            $sql .= " WHERE t.status = ?";
            $params = [$statusFilter];
        }

        $sql .= " ORDER BY t.created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $tickets = $stmt->fetchAll();

        // คำนวณสรุปจำนวนตามสถานะ
        $pendingCount = (int)$db->query("SELECT COUNT(*) FROM support_tickets WHERE status = 'pending'")->fetchColumn();
        $inProgressCount = (int)$db->query("SELECT COUNT(*) FROM support_tickets WHERE status = 'in_progress'")->fetchColumn();
        $resolvedCount = (int)$db->query("SELECT COUNT(*) FROM support_tickets WHERE status = 'resolved'")->fetchColumn();
        $totalCount = $pendingCount + $inProgressCount + $resolvedCount;

        jsonResponse([
            'success' => true,
            'tickets' => $tickets,
            'counts' => [
                'total' => $totalCount,
                'pending' => $pendingCount,
                'in_progress' => $inProgressCount,
                'resolved' => $resolvedCount
            ]
        ]);
    }

    // ผู้ใช้ล็อกอิน: ดูรายการ Ticket ของตนเอง
    if ($action === 'my_tickets') {
        if (!$user) {
            jsonResponse(['success' => true, 'tickets' => []]);
        }

        $stmt = $db->prepare("
            SELECT id, category, message, status, admin_reply, created_at, updated_at 
            FROM support_tickets 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        ");
        $stmt->execute([$user['id']]);
        $tickets = $stmt->fetchAll();

        jsonResponse(['success' => true, 'tickets' => $tickets]);
    }
}

jsonResponse(['success' => false, 'message' => 'คำขอไม่ถูกต้อง'], 400);
