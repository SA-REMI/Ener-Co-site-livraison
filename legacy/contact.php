<?php
/**
 * Ener-Co — traitement du formulaire de contact
 * Reçoit les soumissions de contact.html et envoie un email à contact@ener-co.fr.
 * Aucune base de données, aucune dépendance externe.
 */

declare(strict_types=1);

// --- Configuration ---------------------------------------------------------
const RECIPIENT_EMAIL  = 'contact@ener-co.fr';
const SENDER_EMAIL     = 'no-reply@ener-co.fr';
const SENDER_NAME      = 'Site ener-co.fr';
const SUCCESS_URL      = 'merci.html';
const ERROR_URL        = 'contact.html?erreur=1';
const MAX_FIELD_LENGTH = 5000;

// --- Helpers ---------------------------------------------------------------
function redirect(string $url): void {
    header('Location: ' . $url, true, 303);
    exit;
}

function clean(string $value): string {
    $value = trim($value);
    $value = str_replace(["\r", "\n", "%0a", "%0d"], '', $value);
    return mb_substr($value, 0, MAX_FIELD_LENGTH);
}

function clean_text(string $value): string {
    return trim(mb_substr($value, 0, MAX_FIELD_LENGTH));
}

// --- Méthode HTTP ----------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect('contact.html');
}

// --- Anti-spam : honeypot --------------------------------------------------
// Le champ "website" est caché en CSS. Un humain ne le remplit jamais.
if (!empty($_POST['website'] ?? '')) {
    redirect(SUCCESS_URL); // on fait croire que c'est passé, on jette à la poubelle
}

// --- Anti-spam : délai minimum --------------------------------------------
// Un humain met au moins 3 secondes à remplir le formulaire.
$started = (int)($_POST['started_at'] ?? 0);
if ($started > 0 && (time() - $started) < 3) {
    redirect(SUCCESS_URL);
}

// --- Récupération des champs ----------------------------------------------
$name    = clean($_POST['name']    ?? '');
$company = clean($_POST['company'] ?? '');
$email   = clean($_POST['email']   ?? '');
$phone   = clean($_POST['phone']   ?? '');
$subject = clean($_POST['subject'] ?? '');
$message = clean_text($_POST['message'] ?? '');

// --- Validation -----------------------------------------------------------
$errors = [];
if ($name === '')                                       { $errors[] = 'name'; }
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) { $errors[] = 'email'; }
if ($message === '')                                    { $errors[] = 'message'; }

if (!empty($errors)) {
    redirect(ERROR_URL . '&champs=' . implode(',', $errors));
}

// --- Composition du mail --------------------------------------------------
$subject_line = '[ener-co.fr] ' . ($subject !== '' ? $subject : 'Nouvelle demande de contact');

$body  = "Nouvelle demande reçue depuis le formulaire ener-co.fr\n";
$body .= str_repeat('-', 60) . "\n\n";
$body .= "Nom        : {$name}\n";
$body .= "Société    : " . ($company !== '' ? $company : '(non renseignée)') . "\n";
$body .= "Email      : {$email}\n";
$body .= "Téléphone  : " . ($phone !== '' ? $phone : '(non renseigné)') . "\n";
$body .= "Type       : " . ($subject !== '' ? $subject : '(non précisé)') . "\n\n";
$body .= "Message :\n";
$body .= str_repeat('-', 60) . "\n";
$body .= $message . "\n";
$body .= str_repeat('-', 60) . "\n\n";
$body .= "Soumis le " . date('d/m/Y à H:i') . "\n";
$body .= "IP        : " . ($_SERVER['REMOTE_ADDR'] ?? 'inconnue') . "\n";
$body .= "User-agent: " . substr($_SERVER['HTTP_USER_AGENT'] ?? 'inconnu', 0, 200) . "\n";

$headers   = [];
$headers[] = 'From: ' . SENDER_NAME . ' <' . SENDER_EMAIL . '>';
$headers[] = 'Reply-To: ' . $name . ' <' . $email . '>';
$headers[] = 'X-Mailer: PHP/' . phpversion();
$headers[] = 'Content-Type: text/plain; charset=UTF-8';
$headers[] = 'Content-Transfer-Encoding: 8bit';

// --- Envoi ----------------------------------------------------------------
$sent = @mail(
    RECIPIENT_EMAIL,
    '=?UTF-8?B?' . base64_encode($subject_line) . '?=',
    $body,
    implode("\r\n", $headers),
    '-f' . SENDER_EMAIL
);

if (!$sent) {
    error_log('Ener-Co contact form: mail() returned false. From=' . $email . ' Subject=' . $subject_line);
    redirect(ERROR_URL . '&champs=envoi');
}

redirect(SUCCESS_URL);
