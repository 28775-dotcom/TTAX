<?php
$html = file_get_contents('index.html');
$lines = explode("\n", $html);
for ($i = 1940; $i < count($lines); $i++) {
    echo "L" . ($i + 1) . ": " . $lines[$i] . "\n";
}
