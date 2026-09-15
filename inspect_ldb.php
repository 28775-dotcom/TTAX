<?php
$c = file_get_contents('C:/Users/Cake/AppData/Local/Google/Chrome/User Data/Default/Local Storage/leveldb/009964.ldb');
$pos = strpos($c, 'qxtrxcrfkiwaosozqckw');
if ($pos !== false) {
    echo "Found qxtrxcrfkiwaosozqckw at pos $pos:\n";
    echo substr($c, max(0, $pos - 200), 800) . "\n";
}
$pos2 = strpos($c, 'tax_portal_supabase');
if ($pos2 !== false) {
    echo "Found tax_portal_supabase at pos $pos2:\n";
    echo substr($c, max(0, $pos2 - 200), 800) . "\n";
}
