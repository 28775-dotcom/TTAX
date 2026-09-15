<?php
$lines = file('js/app.js');
foreach ($lines as $n => $l) {
    if (stripos($l, 'btn-calculate') !== false || stripos($l, 'calculateTax') !== false || stripos($l, 'onCalculate') !== false) {
        echo ($n+1) . ": " . trim($l) . "\n";
    }
}
