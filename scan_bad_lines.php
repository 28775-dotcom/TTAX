<?php
$js = file_get_contents('js/app.js');
$lines = explode("\n", $js);
$count = 0;
foreach ($lines as $idx => $line) {
    // Check if line contains double question marks or invalid utf-8
    if (strpos($line, '??') !== false || !mb_check_encoding($line, 'UTF-8')) {
        $count++;
        if ($count <= 25) {
            echo "Line " . ($idx+1) . ": " . trim($line) . "\n";
        }
    }
}
echo "Total lines with ?? or bad UTF-8: $count\n";
