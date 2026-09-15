<?php
$html = file_get_contents('index.html');
echo "Is UTF-8: " . (mb_check_encoding($html, 'UTF-8') ? 'YES' : 'NO') . "\n";
echo "Is TIS-620: " . (mb_check_encoding($html, 'TIS-620') ? 'YES' : 'NO') . "\n";

$lines = explode("\n", $html);
$nonUtf8 = 0;
for ($i = 0; $i < count($lines); $i++) {
    if (!mb_check_encoding($lines[$i], 'UTF-8')) {
        $nonUtf8++;
        if ($nonUtf8 <= 15) {
            echo "Non UTF-8 L" . ($i + 1) . ": " . bin2hex(substr($lines[$i], 0, 40)) . " -> " . mb_convert_encoding($lines[$i], 'UTF-8', 'TIS-620') . "\n";
        }
    }
}
echo "Total non-UTF-8 lines: $nonUtf8\n";
