<?php
$lines = explode("\n", file_get_contents('js/app.js'));
$c = 0;
foreach ($lines as $i => $l) {
    if (strpos($l, '??') !== false) {
        $c++;
    }
}
echo "Lines with ??: $c\n";
