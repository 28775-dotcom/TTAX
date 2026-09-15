<?php
$html = file_get_contents('index.html');
echo "Length: " . strlen($html) . "\n";
// Check for characters with byte value >= 0x80
$nonAscii = [];
for ($i = 0; $i < min(2000, strlen($html)); $i++) {
    $byte = ord($html[$i]);
    if ($byte >= 0x80) {
        $nonAscii[] = sprintf("pos %d: 0x%02X (%s)", $i, $byte, substr($html, max(0, $i-10), 20));
    }
}
echo "Found " . count($nonAscii) . " non-ascii bytes in first 2000 bytes.\n";
foreach (array_slice($nonAscii, 0, 20) as $na) {
    echo "  $na\n";
}
