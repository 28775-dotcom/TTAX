<?php
$i18n = file_get_contents('js/i18n.js');
echo "btn_test_supabase in th: " . (strpos($i18n, "'btn_test_supabase'") !== false ? 'YES' : 'NO') . "\n";
echo "btn_copy_schema in th: " . (strpos($i18n, "'btn_copy_schema'") !== false ? 'YES' : 'NO') . "\n";
echo "btn_sync_now in th: " . (strpos($i18n, "'btn_sync_now'") !== false ? 'YES' : 'NO') . "\n";
echo "backup_export in th: " . (strpos($i18n, "'backup_export'") !== false ? 'YES' : 'NO') . "\n";
echo "backup_import in th: " . (strpos($i18n, "'backup_import'") !== false ? 'YES' : 'NO') . "\n";
echo "backup_reset in th: " . (strpos($i18n, "'backup_reset'") !== false ? 'YES' : 'NO') . "\n";

$lines = explode("\n", $i18n);
foreach ($lines as $i => $l) {
    if (strpos($l, 'btn_test_supabase') !== false || strpos($l, 'btn_sync_now') !== false || strpos($l, 'backup_') !== false) {
        echo "L" . ($i + 1) . ": " . trim($l) . "\n";
    }
}
