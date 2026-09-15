<?php
$c = file_get_contents('C:/Users/Cake/AppData/Local/Google/Chrome/User Data/Default/Local Storage/leveldb/009964.ldb');
$pos = 0;
while (($pos = stripos($c, 'supabase', $pos)) !== false) {
    echo "Found at $pos: " . substr($c, max(0, $pos - 50), 150) . "\n";
    $pos += 8;
}
