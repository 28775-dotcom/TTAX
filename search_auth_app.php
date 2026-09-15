<?php
$lines = file('js/app.js');
foreach ($lines as $num => $line) {
    if (stripos($line, 'login') !== false || stripos($line, 'register') !== false || stripos($line, 'signup') !== false) {
        echo ($num + 1) . ": " . trim($line) . "\n";
    }
}
