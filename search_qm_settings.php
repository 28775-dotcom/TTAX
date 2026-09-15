<?php
$html = file_get_contents('index.html');
$pos = strpos($html, 'id="modal-settings"');
$settingsHtml = substr($html, $pos);
$lines = explode("\n", $settingsHtml);
foreach ($lines as $i => $l) {
    if (strpos($l, '?') !== false && strpos($l, '<?php') === false) {
        echo "Line " . ($i + 1) . ": " . trim($l) . "\n";
    }
}
