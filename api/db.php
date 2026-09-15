<?php
// api/db.php - Database connection and helper functions

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

function getDb() {
    static $db = null;
    if ($db === null) {
        $dataDir = __DIR__ . '/../data';
        if (!is_dir($dataDir)) {
            mkdir($dataDir, 0777, true);
        }
        $dbPath = $dataDir . '/tax_database.sqlite';
        $db = new PDO('sqlite:' . $dbPath);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        
        // Initialize tables if not exist
        $db->exec("
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT,
                full_name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS tax_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                tax_year TEXT NOT NULL,
                income_data TEXT NOT NULL,
                expense_data TEXT NOT NULL,
                allowance_data TEXT NOT NULL,
                summary_data TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS support_tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NULL,
                contact_name TEXT,
                contact_info TEXT,
                category TEXT NOT NULL,
                message TEXT NOT NULL,
                screenshot TEXT,
                status TEXT DEFAULT 'pending',
                admin_reply TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            );
        ");

        // Migrate users table with additional identification & profile columns
        $columnsToEnsure = [
            'tax_id' => 'TEXT',
            'phone' => 'TEXT',
            'address' => 'TEXT',
            'company_name' => 'TEXT',
            'profile_pic' => 'TEXT',
            'role' => "TEXT DEFAULT 'member'"
        ];

        foreach ($columnsToEnsure as $col => $type) {
            try {
                $db->exec("ALTER TABLE users ADD COLUMN $col $type");
            } catch (Exception $e) {
                // Column already exists, safe to ignore
            }
        }

        // Seed default administrator account if not exists (username: admin / password: admin1234)
        $adminCheck = $db->prepare("SELECT id FROM users WHERE username = 'admin'");
        $adminCheck->execute();
        if (!$adminCheck->fetch()) {
            $adminPass = password_hash('admin1234', PASSWORD_DEFAULT);
            $seedAdmin = $db->prepare("
                INSERT INTO users (username, password_hash, full_name, email, role, tax_id, company_name) 
                VALUES ('admin', ?, 'ผู้ดูแลระบบ (Admin TAX PORTAL)', 'admin@taxportal.go.th', 'admin', '0105559999999', 'สำนักงานพัฒนาธุรกรรมและบริการภาษี TAX PORTAL')
            ");
            $seedAdmin->execute([$adminPass]);
        }
    }
    return $db;
}

function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function getCurrentUser() {
    if (!empty($_SESSION['user_id'])) {
        $db = getDb();
        $stmt = $db->prepare("SELECT id, username, full_name, email, tax_id, phone, address, company_name, profile_pic, role FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();
        if ($user) {
            return $user;
        }
    }
    return null;
}
