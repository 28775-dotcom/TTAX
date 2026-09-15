<?php
// api/tax.php - Tax Record Management API
require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? '';
$user = getCurrentUser();
$db = getDb();

// Must be logged in to manage saved records
if (!$user) {
    jsonResponse(['success' => false, 'message' => 'กรุณาเข้าสู่ระบบเพื่อจัดการข้อมูลภาษี'], 401);
}

$userId = $user['id'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'list') {
        $stmt = $db->prepare("
            SELECT id, title, tax_year, summary_data, created_at, updated_at 
            FROM tax_records 
            WHERE user_id = ? 
            ORDER BY updated_at DESC
        ");
        $stmt->execute([$userId]);
        $rows = $stmt->fetchAll();
        
        $list = array_map(function($row) {
            return [
                'id' => (int)$row['id'],
                'title' => $row['title'],
                'tax_year' => $row['tax_year'],
                'summary' => json_decode($row['summary_data'], true),
                'created_at' => $row['created_at'],
                'updated_at' => $row['updated_at']
            ];
        }, $rows);
        
        jsonResponse(['success' => true, 'records' => $list]);
    }
    
    if ($action === 'get') {
        $id = (int)($_GET['id'] ?? 0);
        $stmt = $db->prepare("SELECT * FROM tax_records WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $userId]);
        $row = $stmt->fetch();
        
        if (!$row) {
            jsonResponse(['success' => false, 'message' => 'ไม่พบข้อมูลที่ต้องการ'], 404);
        }
        
        jsonResponse([
            'success' => true,
            'record' => [
                'id' => (int)$row['id'],
                'title' => $row['title'],
                'tax_year' => $row['tax_year'],
                'income_data' => json_decode($row['income_data'], true),
                'expense_data' => json_decode($row['expense_data'], true),
                'allowance_data' => json_decode($row['allowance_data'], true),
                'summary_data' => json_decode($row['summary_data'], true),
                'updated_at' => $row['updated_at']
            ]
        ]);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true) ?? $_POST;
    
    if ($action === 'save') {
        $id = !empty($data['id']) ? (int)$data['id'] : null;
        $title = trim($data['title'] ?? 'แบบคำนวณภาษีของฉัน');
        $taxYear = trim($data['tax_year'] ?? '2567');
        $incomeData = json_encode($data['income_data'] ?? [], JSON_UNESCAPED_UNICODE);
        $expenseData = json_encode($data['expense_data'] ?? [], JSON_UNESCAPED_UNICODE);
        $allowanceData = json_encode($data['allowance_data'] ?? [], JSON_UNESCAPED_UNICODE);
        $summaryData = json_encode($data['summary_data'] ?? [], JSON_UNESCAPED_UNICODE);
        
        if ($id) {
            // Check ownership
            $check = $db->prepare("SELECT id FROM tax_records WHERE id = ? AND user_id = ?");
            $check->execute([$id, $userId]);
            if ($check->fetch()) {
                $stmt = $db->prepare("
                    UPDATE tax_records 
                    SET title = ?, tax_year = ?, income_data = ?, expense_data = ?, allowance_data = ?, summary_data = ?, updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ? AND user_id = ?
                ");
                $stmt->execute([$title, $taxYear, $incomeData, $expenseData, $allowanceData, $summaryData, $id, $userId]);
                jsonResponse(['success' => true, 'id' => $id, 'message' => 'อัปเดตข้อมูลภาษีเรียบร้อยแล้ว']);
            }
        }
        
        // New record
        $stmt = $db->prepare("
            INSERT INTO tax_records (user_id, title, tax_year, income_data, expense_data, allowance_data, summary_data) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$userId, $title, $taxYear, $incomeData, $expenseData, $allowanceData, $summaryData]);
        $newId = (int)$db->lastInsertId();
        
        jsonResponse(['success' => true, 'id' => $newId, 'message' => 'บันทึกข้อมูลภาษีเรียบร้อยแล้ว']);
    }
    
    if ($action === 'delete') {
        $id = (int)($data['id'] ?? ($_GET['id'] ?? 0));
        $stmt = $db->prepare("DELETE FROM tax_records WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $userId]);
        
        if ($stmt->rowCount() > 0) {
            jsonResponse(['success' => true, 'message' => 'ลบข้อมูลเรียบร้อยแล้ว']);
        } else {
            jsonResponse(['success' => false, 'message' => 'ไม่พบข้อมูลหรือไม่มีสิทธิ์ลบ'], 404);
        }
    }
}

jsonResponse(['success' => false, 'message' => 'คำขอไม่ถูกต้อง'], 400);
