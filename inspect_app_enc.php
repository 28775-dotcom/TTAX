<?php
$f = 'js/app.js';
$data = file_get_contents($f);
echo "Length: " . strlen($data) . "\n";
echo "First 20 bytes hex: " . bin2hex(substr($data, 0, 20)) . "\n";
if (strpos($data, "login") !== false) {
    echo "Found 'login' in file!\n";
} else {
    echo "'login' NOT found in file!\n";
}
