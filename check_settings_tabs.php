<?php
$html = file_get_contents('index.html');
$pos = strpos($html, 'id="tab-supabase"');
if ($pos !== false) {
    echo substr($html, $pos - 400, 3000);
}
