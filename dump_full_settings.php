<?php
$html = file_get_contents('index.html');
$pos = strpos($html, 'id="modal-settings"');
$end = strpos($html, '<!-- Scripts -->');
$snippet = substr($html, $pos, $end - $pos);
$lines = explode("\n", $snippet);
for ($i = 0; $i < count($lines); $i++) {
    echo "L" . ($i + 1) . ": " . $lines[$i] . "\n";
}
