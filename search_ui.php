<?php
$ui = file_get_contents('js/settings-ui.js');
$lines = explode("\n", $ui);
foreach ($lines as $i => $l) {
    if (strpos($l, 'Supabase') !== false || strpos($l, 'จัดการข้อมูล') !== false || strpos($l, '??') !== false) {
        echo "L" . ($i + 1) . ": " . trim($l) . "\n";
    }
}
