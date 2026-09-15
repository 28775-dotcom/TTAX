<?php
$html = file_get_contents('index.html');
$lines = explode("\n", $html);
$count = 0;
for ($i = 0; $i < count($lines); $i++) {
    if (strpos($lines[$i], "\xEF\xBF\xBD") !== false) {
        $count++;
        if ($count <= 25) {
            echo "L" . ($i + 1) . ": " . trim(substr($lines[$i], 0, 150)) . "\n";
        }
    }
}
echo "Total lines with replacement characters (): $count\n";
