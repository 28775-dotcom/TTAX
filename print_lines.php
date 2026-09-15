<?php
$html = file_get_contents('index.html');
$lines = explode("\n", $html);
for ($i = 1640; $i < 1720 && $i < count($lines); $i++) {
    $line = $lines[$i];
    echo ($i+1) . ": " . $line . "\n";
}
