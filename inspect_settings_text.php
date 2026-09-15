<?php
$html = file_get_contents('index.html');
$start = strpos($html, 'id="modal-settings"');
$end = strpos($html, '</div>', strpos($html, 'id="tab-backup"'));
// Find closing div of modal-settings
$closeModal = strpos($html, '<!-- Scripts -->', $start);
$modalContent = substr($html, $start, $closeModal - $start);

echo "Modal content length: " . strlen($modalContent) . "\n";
// Print any non-standard or potential issues
preg_match_all('/>([^<]+)</', $modalContent, $matches);
foreach ($matches[1] as $text) {
    $t = trim($text);
    if ($t !== '') {
        echo "TEXT: " . $t . "\n";
    }
}
