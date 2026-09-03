<<<<<<< HEAD
<?php
/**
 * HTTPS mail relay for Local Van (Render → this host → SMTP).
 * Upload to: https://local-van.com/api/send-mail.php
 *
 * Why: Render free tier blocks outbound SMTP (ports 25/465/587), causing ETIMEDOUT.
 * This relay accepts HTTPS POSTs and sends via Stackmail on the hosting server.
 *
 * Configure credentials via environment / hosting panel, or edit the SMTP_* defaults below
 * (do not commit real passwords to git if this file is public).
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, X-Mail-Relay-Secret');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

// Must match MAIL_RELAY_SECRET on the Node / Render server
$RELAY_SECRET = getenv('MAIL_RELAY_SECRET') ?: 'local-van-mail-relay-change-me';

$provided = $_SERVER['HTTP_X_MAIL_RELAY_SECRET'] ?? '';
if (!hash_equals($RELAY_SECRET, $provided)) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
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
    echo json_encode(['ok' => false, 'error' => 'Missing to, subject, or body']);
    exit;
}

if (!filter_var($to, FILTER_VALIDATE_EMAIL) || !filter_var($fromEmail, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid email address']);
    exit;
}

$SMTP_HOST = getenv('SMTP_HOST') ?: 'smtp.stackmail.com';
$SMTP_PORT = (int)(getenv('SMTP_PORT') ?: 587);
$SMTP_USER = getenv('SMTP_USER') ?: 'info@local-van.com';
$SMTP_PASS = getenv('SMTP_PASS') ?: '';

$autoloadCandidates = [
    __DIR__ . '/../vendor/autoload.php',
    __DIR__ . '/vendor/autoload.php',
    __DIR__ . '/../../vendor/autoload.php',
];

$loaded = false;
foreach ($autoloadCandidates as $autoload) {
    if (file_exists($autoload)) {
        require_once $autoload;
        $loaded = true;
        break;
    }
}

if (!$loaded && file_exists(__DIR__ . '/PHPMailer/PHPMailer.php')) {
    require_once __DIR__ . '/PHPMailer/PHPMailer.php';
    require_once __DIR__ . '/PHPMailer/SMTP.php';
    require_once __DIR__ . '/PHPMailer/Exception.php';
    $loaded = true;
}

if (!$loaded || $SMTP_PASS === '') {
    $headers = [];
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = 'Content-type: text/html; charset=UTF-8';
    $headers[] = 'From: ' . sprintf('%s <%s>', $fromName, $fromEmail);
    $headers[] = 'Reply-To: ' . $fromEmail;
    $body = $html !== '' ? $html : nl2br(htmlspecialchars($text, ENT_QUOTES, 'UTF-8'));
    $ok = @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, implode("\r\n", $headers));
    if (!$ok) {
        http_response_code(500);
        echo json_encode([
            'ok' => false,
            'error' => 'Unable to send mail. Install PHPMailer and set SMTP_PASS, or enable PHP mail().',
        ]);
        exit;
    }
    echo json_encode(['ok' => true, 'transport' => 'mail']);
    exit;
}

try {
    $mail = new PHPMailer\PHPMailer\PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = $SMTP_HOST;
    $mail->SMTPAuth = true;
    $mail->Username = $SMTP_USER;
    $mail->Password = $SMTP_PASS;
    $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = $SMTP_PORT;
    $mail->CharSet = 'UTF-8';
    $mail->setFrom($fromEmail, $fromName);
    $mail->addAddress($to);
    $mail->Subject = $subject;
    if ($html !== '') {
        $mail->isHTML(true);
        $mail->Body = $html;
        $mail->AltBody = $text !== '' ? $text : strip_tags($html);
    } else {
        $mail->isHTML(false);
        $mail->Body = $text;
    }
    $mail->send();
    echo json_encode(['ok' => true, 'transport' => 'phpmailer-smtp']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => $e->getMessage(),
    ]);
}
=======
<?php
/**
 * HTTPS mail relay for Local Van (Render → this host → SMTP).
 * Upload to: https://local-van.com/api/send-mail.php
 *
 * Why: Render free tier blocks outbound SMTP (ports 25/465/587), causing ETIMEDOUT.
 * This relay accepts HTTPS POSTs and sends via Stackmail on the hosting server.
 *
 * Configure credentials via environment / hosting panel, or edit the SMTP_* defaults below
 * (do not commit real passwords to git if this file is public).
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, X-Mail-Relay-Secret');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

// Must match MAIL_RELAY_SECRET on the Node / Render server
$RELAY_SECRET = getenv('MAIL_RELAY_SECRET') ?: 'local-van-mail-relay-change-me';

$provided = $_SERVER['HTTP_X_MAIL_RELAY_SECRET'] ?? '';
if (!hash_equals($RELAY_SECRET, $provided)) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
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
    echo json_encode(['ok' => false, 'error' => 'Missing to, subject, or body']);
    exit;
}

if (!filter_var($to, FILTER_VALIDATE_EMAIL) || !filter_var($fromEmail, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid email address']);
    exit;
}

$SMTP_HOST = getenv('SMTP_HOST') ?: 'smtp.stackmail.com';
$SMTP_PORT = (int)(getenv('SMTP_PORT') ?: 587);
$SMTP_USER = getenv('SMTP_USER') ?: 'info@local-van.com';
$SMTP_PASS = getenv('SMTP_PASS') ?: '';

$autoloadCandidates = [
    __DIR__ . '/../vendor/autoload.php',
    __DIR__ . '/vendor/autoload.php',
    __DIR__ . '/../../vendor/autoload.php',
];

$loaded = false;
foreach ($autoloadCandidates as $autoload) {
    if (file_exists($autoload)) {
        require_once $autoload;
        $loaded = true;
        break;
    }
}

if (!$loaded && file_exists(__DIR__ . '/PHPMailer/PHPMailer.php')) {
    require_once __DIR__ . '/PHPMailer/PHPMailer.php';
    require_once __DIR__ . '/PHPMailer/SMTP.php';
    require_once __DIR__ . '/PHPMailer/Exception.php';
    $loaded = true;
}

if (!$loaded || $SMTP_PASS === '') {
    $headers = [];
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = 'Content-type: text/html; charset=UTF-8';
    $headers[] = 'From: ' . sprintf('%s <%s>', $fromName, $fromEmail);
    $headers[] = 'Reply-To: ' . $fromEmail;
    $body = $html !== '' ? $html : nl2br(htmlspecialchars($text, ENT_QUOTES, 'UTF-8'));
    $ok = @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, implode("\r\n", $headers));
    if (!$ok) {
        http_response_code(500);
        echo json_encode([
            'ok' => false,
            'error' => 'Unable to send mail. Install PHPMailer and set SMTP_PASS, or enable PHP mail().',
        ]);
        exit;
    }
    echo json_encode(['ok' => true, 'transport' => 'mail']);
    exit;
}

try {
    $mail = new PHPMailer\PHPMailer\PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = $SMTP_HOST;
    $mail->SMTPAuth = true;
    $mail->Username = $SMTP_USER;
    $mail->Password = $SMTP_PASS;
    $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = $SMTP_PORT;
    $mail->CharSet = 'UTF-8';
    $mail->setFrom($fromEmail, $fromName);
    $mail->addAddress($to);
    $mail->Subject = $subject;
    if ($html !== '') {
        $mail->isHTML(true);
        $mail->Body = $html;
        $mail->AltBody = $text !== '' ? $text : strip_tags($html);
    } else {
        $mail->isHTML(false);
        $mail->Body = $text;
    }
    $mail->send();
    echo json_encode(['ok' => true, 'transport' => 'phpmailer-smtp']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => $e->getMessage(),
    ]);
}
>>>>>>> d99250162e1829b35a0e58cb77f3deb4ebcf610e
