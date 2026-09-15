<?php
$i18n = file_get_contents('js/i18n.js');
$lines = explode("\n", $i18n);
for ($i = 0; $i < 100; $i++) {
    echo "L" . ($i + 1) . ": " . $lines[$i] . "\n";
}
