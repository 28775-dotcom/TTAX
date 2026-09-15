<?php
$files = array_merge(
    glob('*.sql'), glob('*.js'), glob('*.php'), glob('*.html'), glob('*.txt'), glob('*.bat'),
    glob('js/*.js'), glob('api/*.php'), glob('data/*.*')
);

foreach ($files as $f) {
    if (!is_file($f)) continue;
    $content = file_get_contents($f);
    if (preg_match('/eyJ[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]*/', $content, $m)) {
        echo "Found JWT in $f: " . $m[0] . "\n";
    }
}
