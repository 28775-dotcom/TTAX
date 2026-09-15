<?php
$leveldbDir = 'C:/Users/Cake/AppData/Local/Google/Chrome/User Data/Default/Local Storage/leveldb';
if (is_dir($leveldbDir)) {
    foreach (glob($leveldbDir . '/*.*') as $lf) {
        $c = @file_get_contents($lf);
        if ($c && (strpos($c, 'qxtrxcrfkiwaosozqckw') !== false || strpos($c, 'tax_portal_supabase') !== false || strpos($c, 'supabase') !== false)) {
            echo "Found in: $lf\n";
            preg_match_all('/eyJ[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]*/', $c, $matches);
            foreach ($matches[0] as $jwt) {
                echo "  JWT: $jwt\n";
            }
        }
    }
}
