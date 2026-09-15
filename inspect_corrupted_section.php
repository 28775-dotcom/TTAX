<?php
$app = file_get_contents('js/app.js');
$lines = explode("\n", $app);
for ($i = 1780; $i <= 1860; $i++) {
    if (isset($lines[$i])) {
        echo "L" . ($i + 1) . ": " . $lines[$i] . "\n";
    }
}
