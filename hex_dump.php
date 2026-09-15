<?php
$js = file_get_contents('js/app.js');
for ($i = 0; $i < 100; $i++) {
    printf("%02X ", ord($js[$i]));
    if (($i + 1) % 16 == 0) echo "\n";
}
echo "\n";
