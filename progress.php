<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$storagePath = __DIR__ . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'completion-progress.json';

function respond(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function emptyState(): array
{
    return [
        'updatedAt' => gmdate('c'),
        'items' => [],
        'failedQuestions' => [],
        'highlights' => [],
    ];
}

function ensureStorageExists(string $path): void
{
    if (is_file($path)) {
        return;
    }

    $directory = dirname($path);

    if (!is_dir($directory) && !mkdir($directory, 0777, true) && !is_dir($directory)) {
        respond(500, ['error' => 'No se pudo crear el directorio de almacenamiento.']);
    }

    $initialState = [
        'updatedAt' => gmdate('c'),
        'items' => new stdClass(),
        'failedQuestions' => new stdClass(),
        'highlights' => new stdClass(),
    ];

    if (file_put_contents($path, json_encode($initialState, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) === false) {
        respond(500, ['error' => 'No se pudo inicializar el almacenamiento de progreso.']);
    }
}

function readStorage(string $path): array
{
    ensureStorageExists($path);
    $contents = file_get_contents($path);

    if ($contents === false || $contents === '') {
        return emptyState();
    }

    $data = json_decode($contents, true);

    if (!is_array($data)) {
        return emptyState();
    }

    if (!isset($data['items']) || !is_array($data['items'])) {
        $data['items'] = [];
    }

    if (!isset($data['failedQuestions']) || !is_array($data['failedQuestions'])) {
        $data['failedQuestions'] = [];
    }

    if (!isset($data['highlights']) || !is_array($data['highlights'])) {
        $data['highlights'] = [];
    }

    return $data;
}

function writeStorage(string $path, array $data): array
{
    ensureStorageExists($path);

    $handle = fopen($path, 'c+');

    if ($handle === false) {
        respond(500, ['error' => 'No se pudo abrir el almacenamiento de progreso.']);
    }

    if (!flock($handle, LOCK_EX)) {
        fclose($handle);
        respond(500, ['error' => 'No se pudo bloquear el almacenamiento de progreso.']);
    }

    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);

    return $data;
}

function requireKey(?array $item, string $errorMessage): string
{
    if (!is_array($item) || !is_string($item['key'] ?? null) || trim($item['key']) === '') {
        respond(400, ['error' => $errorMessage]);
    }

    return trim((string)$item['key']);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $data = readStorage($storagePath);
    respond(200, [
        'items' => $data['items'],
        'failedQuestions' => $data['failedQuestions'],
        'highlights' => $data['highlights'],
    ]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['error' => 'Método no permitido.']);
}

$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput ?: '', true);

if (!is_array($payload)) {
    respond(400, ['error' => 'El cuerpo de la petición no es válido.']);
}

$action = $payload['action'] ?? '';
$item = $payload['item'] ?? null;
$data = readStorage($storagePath);

if ($action === 'complete') {
    $key = requireKey($item, 'Falta la clave del apartado.');
    $data['items'][$key] = [
        'themeTitle' => (string)($item['themeTitle'] ?? ''),
        'topicTitle' => (string)($item['topicTitle'] ?? ''),
        'sectionLabel' => (string)($item['sectionLabel'] ?? ''),
        'pageType' => (string)($item['pageType'] ?? ''),
        'link' => (string)($item['link'] ?? '#'),
        'completedAt' => gmdate('c'),
    ];
} elseif ($action === 'uncomplete') {
    $key = requireKey($item, 'Falta la clave del apartado.');
    unset($data['items'][$key]);
} elseif ($action === 'record_failed_questions') {
    $questions = is_array($item) ? ($item['questions'] ?? null) : null;

    if (!is_array($questions)) {
        respond(400, ['error' => 'No se han recibido preguntas falladas válidas.']);
    }

    foreach ($questions as $question) {
        if (!is_array($question) || !is_string($question['key'] ?? null) || trim($question['key']) === '') {
            continue;
        }

        $questionKey = trim((string)$question['key']);
        $existing = $data['failedQuestions'][$questionKey] ?? null;
        $failedCount = is_array($existing) ? (int)($existing['failedCount'] ?? 0) : 0;
        $reviewCorrectCount = is_array($existing) ? (int)($existing['reviewCorrectCount'] ?? 0) : 0;

        $data['failedQuestions'][$questionKey] = [
            'key' => $questionKey,
            'sourceLink' => (string)($question['sourceLink'] ?? ''),
            'topicTitle' => (string)($question['topicTitle'] ?? ''),
            'sectionLabel' => (string)($question['sectionLabel'] ?? ''),
            'questionData' => is_array($question['questionData'] ?? null) ? $question['questionData'] : [],
            'failedCount' => $failedCount + 1,
            'reviewCorrectCount' => $reviewCorrectCount,
            'lastFailedAt' => gmdate('c'),
        ];
    }
} elseif ($action === 'mark_review_question_correct') {
    $key = requireKey($item, 'Falta la clave de la pregunta fallada.');

    if (isset($data['failedQuestions'][$key]) && is_array($data['failedQuestions'][$key])) {
        $currentCount = (int)($data['failedQuestions'][$key]['reviewCorrectCount'] ?? 0) + 1;

        if ($currentCount >= 3) {
            unset($data['failedQuestions'][$key]);
        } else {
            $data['failedQuestions'][$key]['reviewCorrectCount'] = $currentCount;
            $data['failedQuestions'][$key]['lastReviewedAt'] = gmdate('c');
        }
    }
} elseif ($action === 'delete_failed_question') {
    $key = requireKey($item, 'Falta la clave de la pregunta fallada.');
    unset($data['failedQuestions'][$key]);
} elseif ($action === 'add_highlight') {
    if (!is_array($item) || !is_string($item['sourceKey'] ?? null) || trim($item['sourceKey']) === '') {
        respond(400, ['error' => 'Falta la clave del contenido subrayado.']);
    }

    if (!is_string($item['key'] ?? null) || trim($item['key']) === '') {
        respond(400, ['error' => 'Falta la clave del subrayado.']);
    }

    if (!is_string($item['text'] ?? null) || trim($item['text']) === '') {
        respond(400, ['error' => 'Falta el texto subrayado.']);
    }

    $sourceKey = trim((string)$item['sourceKey']);
    $highlightKey = trim((string)$item['key']);
    $highlights = $data['highlights'][$sourceKey] ?? [];

    if (!is_array($highlights)) {
        $highlights = [];
    }

    $existingIndex = null;

    foreach ($highlights as $index => $highlight) {
        if (is_array($highlight) && (string)($highlight['key'] ?? '') === $highlightKey) {
            $existingIndex = $index;
            break;
        }
    }

    $highlightPayload = [
        'key' => $highlightKey,
        'text' => trim((string)$item['text']),
        'start' => max(0, (int)($item['start'] ?? 0)),
        'end' => max(0, (int)($item['end'] ?? 0)),
        'color' => is_string($item['color'] ?? null) && trim((string)$item['color']) !== '' ? trim((string)$item['color']) : 'yellow',
        'createdAt' => gmdate('c'),
    ];

    if ($existingIndex !== null) {
        $highlightPayload['createdAt'] = (string)($highlights[$existingIndex]['createdAt'] ?? gmdate('c'));
        $highlights[$existingIndex] = $highlightPayload;
    } else {
        $highlights[] = $highlightPayload;
    }

    $data['highlights'][$sourceKey] = array_values($highlights);
} elseif ($action === 'delete_highlight') {
    if (!is_array($item) || !is_string($item['sourceKey'] ?? null) || trim($item['sourceKey']) === '') {
        respond(400, ['error' => 'Falta la clave del contenido subrayado.']);
    }

    if (!is_string($item['key'] ?? null) || trim($item['key']) === '') {
        respond(400, ['error' => 'Falta la clave del subrayado.']);
    }

    $sourceKey = trim((string)$item['sourceKey']);
    $highlightKey = trim((string)$item['key']);
    $highlights = $data['highlights'][$sourceKey] ?? [];

    if (is_array($highlights)) {
        $highlights = array_values(array_filter($highlights, static function ($highlight) use ($highlightKey) {
            return !is_array($highlight) || (string)($highlight['key'] ?? '') !== $highlightKey;
        }));

        if ($highlights === []) {
            unset($data['highlights'][$sourceKey]);
        } else {
            $data['highlights'][$sourceKey] = $highlights;
        }
    }
} else {
    respond(400, ['error' => 'Acción no válida.']);
}

$data['updatedAt'] = gmdate('c');
$stored = writeStorage($storagePath, $data);

respond(200, [
    'ok' => true,
    'items' => $stored['items'],
    'failedQuestions' => $stored['failedQuestions'],
    'highlights' => $stored['highlights'],
]);
