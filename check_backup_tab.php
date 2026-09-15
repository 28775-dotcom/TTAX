<?php
$html = file_get_contents('index.html');
$pos = strpos($html, 'id="tab-supabase"');
$posEnd = strpos($html, '</main>');
if ($posEnd === false) $posEnd = strpos($html, '<!-- Scripts -->');
echo substr($html, $pos, $posEnd - $pos);
