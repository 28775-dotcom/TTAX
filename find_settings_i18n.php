<?php
$lines = file('js/i18n.js');
foreach ($lines as $num => $line) {
    if (stripos($line, 'setting') !== false || stripos($line, 'btn_') !== false) {
        echo ($num + 1) . ": " . trim($line) . "\n";
    }
}
