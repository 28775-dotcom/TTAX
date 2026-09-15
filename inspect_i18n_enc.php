<?php
$f = 'js/i18n.js';
$data = file_get_contents($f);
echo "Length: " . strlen($data) . "\n";
echo "First 10 bytes hex: " . bin2hex(substr($data, 0, 10)) . "\n";
if (strpos($data, "settings") !== false) {
    echo "Found 'settings' in file!\n";
} else {
    echo "'settings' NOT found in file!\n";
}
