<?php
$html = file_get_contents('index.html');
$lines = explode("\n", $html);
foreach ($lines as $i => $l) {
    if (strpos($l, '??') !== false) {
        echo "L" . ($i + 1) . ": " . trim($l) . "\n";
    }
}
