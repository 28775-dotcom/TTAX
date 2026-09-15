<?php
$html = file_get_contents('index.html');
$pos = strpos($html, 'id="modal-settings"');
if ($pos !== false) {
    echo substr($html, $pos, 6000);
}
