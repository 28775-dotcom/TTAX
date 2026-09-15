<?php
$html = file_get_contents('index.html');
$lines = explode("\n", $html);
for ($i = 30; $i <= 60; $i++) {
    echo "L" . ($i + 1) . ": " . $lines[$i] . "\n";
}
