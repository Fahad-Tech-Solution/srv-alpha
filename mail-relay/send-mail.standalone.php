<?php
/**
 * Standalone HTTPS mail relay (no Composer / PHPMailer required).
 * Upload as: https://local-van.com/api/send-mail.php
 *
 * Uses PHP mail() on the hosting server (bypasses Render SMTP port blocks).
 * Set the SAME secret on Render: MAIL_RELAY_SECRET
 */
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

// CHANGE THIS and set the same value in Render MAIL_RELAY_SECRET
$RELAY_SECRET = 'local-van-mail-relay-change-me';

$provided = $_SERVER['HTTP_X_MAIL_RELAY_SECRET'] ?? '';
if (!hash_equals($RELAY_SECRET, $provided)) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid JSON']);
    exit;
}

$to = trim((string)($data['to'] ?? ''));
$subject = trim((string)($data['subject'] ?? ''));
$text = (string)($data['text'] ?? '');
$html = (string)($data['html'] ?? '');
$fromEmail = trim((string)($data['fromEmail'] ?? 'info@local-van.com'));
$fromName = trim((string)($data['fromName'] ?? 'Local Van'));

if ($to === '' || $subject === '' || ($text === '' && $html === '')) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Missing fields']);
    exit;
}

if (!filter_var($to, FILTER_VALIDATE_EMAIL) || !filter_var($fromEmail, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid email']);
    exit;
}

$body = $html !== '' ? $html : nl2br(htmlspecialchars($text, ENT_QUOTES, 'UTF-8'));
$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$headers = [
    'MIME-Version: 1.0',
    'Content-type: text/html; charset=UTF-8',
    'From: ' . sprintf('%s <%s>', $fromName, $fromEmail),
    'Reply-To: ' . $fromEmail,
    'X-Mailer: LocalVan-Relay',
];

$ok = @mail($to, $encodedSubject, $body, implode("\r\n", $headers));
if (!$ok) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'PHP mail() failed']);
    exit;
}

echo json_encode(['ok' => true, 'transport' => 'php-mail']);
