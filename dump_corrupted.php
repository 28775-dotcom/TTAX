<?php
$js = file_get_contents('js/app.js');
$lines = explode("\n", $js);
$blocks = [];
$currentBlock = [];

foreach ($lines as $idx => $line) {
    if (strpos($line, '??') !== false || !mb_check_encoding($line, 'UTF-8')) {
        $currentBlock[] = ($idx + 1) . ": " . $line;
    } else {
        if (!empty($currentBlock)) {
            $blocks[] = $currentBlock;
            $currentBlock = [];
        }
    }
}
if (!empty($currentBlock)) $blocks[] = $currentBlock;

echo "Found " . count($blocks) . " blocks of corrupted lines.\n";
foreach ($blocks as $bIdx => $b) {
    echo "--- Block " . ($bIdx + 1) . " (lines " . count($b) . ") ---\n";
    foreach ($b as $l) {
        echo $l . "\n";
    }
}
