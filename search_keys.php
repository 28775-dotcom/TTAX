<?php
$paths = [
    'C:/Users/Cake/Desktop',
    'C:/Users/Cake/Downloads',
    'C:/Users/Cake/Documents',
    'd:/'
];
foreach ($paths as $p) {
    if (is_dir($p)) {
        foreach (glob($p . '/*.*') as $f) {
            if (is_file($f) && filesize($f) < 500000) {
                $c = @file_get_contents($f);
                if ($c && (strpos($c, 'qxtrxcrfkiwaosozqckw') !== false || stripos($c, 'supabase') !== false)) {
                    echo "Found in $f\n";
                    if (preg_match('/eyJ[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]*/', $c, $m)) {
                        echo "  KEY: " . $m[0] . "\n";
                    }
                }
            }
        }
    }
}
