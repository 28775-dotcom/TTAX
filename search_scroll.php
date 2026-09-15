<?php
$files = array_merge(glob('js/*.js'), glob('*.html'));
foreach ($files as $f) {
    $c = file_get_contents($f);
    $lines = explode("\n", $c);
    foreach ($lines as $i => $l) {
        if (strpos($l, 'scrollTo') !== false) {
            echo "$f L" . ($i + 1) . ": " . trim($l) . "\n";
        }
    }
}
