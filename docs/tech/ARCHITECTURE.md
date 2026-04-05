# Media Generation Architecture

## Цель

Этот документ фиксирует актуальную архитектуру media-подсистемы после рефакторинга:

- единый Kie.ai provider вместо набора legacy-провайдеров,
- единый processing flow для generation/completion,
- backoff polling + webhook callback,
- минимальные интерфейсы и меньший объем связанного кода.

## Актуальная структура

`backend/features/media`:

- `routes/generate.ts` — прием запроса, валидация, создание `mediaRequest`.
- `generation.service.ts` — thin entrypoint, делегирует в `media-processor`.
- `media-processor.ts` — единый orchestration для generate/completion/failure.
- `task-tracking.service.ts` — async tracking задач с exponential backoff.
- `routes/completion.ts` — manual completion check + webhook endpoint.
- `providers/provider-manager.ts` — выбор provider по `MEDIA_MODELS`.
- `providers/kieai/unified-provider.ts` — единый provider для всех Kie.ai моделей.
- `providers/kieai/mappers.ts` — нормализация model-specific параметров.
- `providers/kieai/interfaces.ts` — минимальные унифицированные контракты Kie.ai.

## Поток обработки

1. Клиент вызывает `POST /api/media/generate`.
2. Создается `mediaRequest` со статусом `PENDING`.
3. `generateMedia()` передает управление в `processGeneration()`.
4. Выбранный provider:
    - либо возвращает `taskId` (async flow),
    - либо возвращает файлы сразу (sync flow).
5. Для async flow:
    - задача ставится на tracking в `task-tracking.service.ts`,
    - статус проверяется по backoff-интервалам,
    - при `done` вызывается completion pipeline.
6. Completion pipeline:
    - идемпотентный claim записи,
    - загрузка/сохранение файлов,
    - Telegram + SSE,
    - фоновая выгрузка image URL (imgbb) без блокировки UI-ready статуса.
7. Для webhook flow:
    - Kie.ai callback идет в `POST /api/media/completion/webhook/kieai`,
    - обработчик резолвит запрос по `requestId` или `taskId`,
    - завершает задачу через тот же completion pipeline.

## Kie.ai слой

### Было

- много отдельных provider-файлов по моделям,
- дублирующая логика status/result,
- тяжелый слой интерфейсов.

### Стало

- `unified-provider.ts` с config-driven map по моделям,
- единая реализация `generate`, `checkTaskStatus`, `getTaskResult`,
- один источник маппинга входных параметров,
- минимум интерфейсов в `kieai/interfaces.ts`.

## Reliability notes

- Polling использует backoff, снижая число лишних API вызовов.
- Webhook поддерживает payload-варианты:
    - с `requestId`,
    - только с `taskId` + `state`.
- Completion pipeline реализован идемпотентно (защита от race/double-completion).

## Snapshot baseline approach (без тестового кода)

Для фиксации текущего поведения перед следующими изменениями используем operational snapshot-подход:

1. Зафиксировать baseline эндпойнтов:
    - `POST /api/media/generate`,
    - `POST /api/media/completion/check/:requestId`,
    - `POST /api/media/completion/webhook/kieai`.
2. Для каждого сценария сохранить:
    - пример request payload,
    - ожидаемый status transition (`PENDING -> PROCESSING -> COMPLETED/FAILED`),
    - форму SSE событий,
    - форму записи `mediaRequest/mediaFile` после completion.
3. Сравнивать новые изменения с baseline перед merge (manual snapshot review).

Это дает быстрый контроль регрессий даже без отдельного snapshot test suite.

## Open items

- Интеграционные/нагрузочные тесты вынесены отдельно (по текущему запросу не реализуются).
- Оставшиеся frontend TS проблемы не связаны с media-архитектурой и требуют отдельного прохода.
