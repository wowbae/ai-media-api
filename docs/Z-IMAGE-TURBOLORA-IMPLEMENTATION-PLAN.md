# План внедрения `wavespeed-ai/z-image/turbo-lora`

## Цель

Добавить в текущую media-платформу поддержку модели `wavespeed-ai/z-image/turbo-lora` (text-to-image с optional LoRA), при этом минимально и безопасно улучшить структуру провайдеров (`kieai`, `wavespeed`, `laozhang`), чтобы дальнейшее подключение моделей было проще и предсказуемее.

Источник по модели и параметрам: [WaveSpeed Z-Image-Turbo LoRA](https://wavespeed.ai/models/wavespeed-ai/z-image/turbo-lora).

## Что уже есть сейчас (важно для объёма работ)

- Папка `server/features/media/providers/wavespeed` уже существует.
- В `provider-manager` уже подключается `wavespeed` провайдер.
- В `.env.example` уже есть ключ `WAVESPEED_AI_API_KEY`.
- В `MEDIA_MODELS` уже есть wavespeed-модель (видео), поэтому добавление image-модели будет расширением, а не внедрением с нуля.

## Область изменений

1. Добавление модели `Z-Image-Turbo LoRA` в каталог моделей.
2. Добавление/уточнение env-переменной для API-ключа (без ломки текущей совместимости).
3. Расширение wavespeed-провайдера под image-generation endpoint.
4. Небольшой структурный рефакторинг provider-слоя (без масштабного переписывания всей системы).
5. Проверка интеграции в генерации, статусах задач и отдаче файлов.

## План внедрения (по шагам)

### Этап 1. Зафиксировать контракт и параметры модели

- Подтвердить поля для `z-image/turbo-lora`: `prompt`, `size`/`width`/`height`, `seed`, `loras[]`, sync/base64 flags.
- Определить минимальный V1-сет параметров:
    - обязательно: `prompt`;
    - опционально: `aspectRatio` (маппинг в width/height или size), `seed`;
    - LoRA-часть вводить как controlled feature (ограничить до 3 LoRA согласно документации).
- Зафиксировать, какой формат результата получаем от API (URL/base64) и какой из них используем в системе как стандарт.

### Этап 2. ENV и конфигурация

- Оставить текущую переменную `WAVESPEED_AI_API_KEY` как основную (она уже используется).
- При необходимости добавить alias-поддержку чтения:
    - приоритет `WAVESPEED_API_KEY`,
    - fallback `WAVESPEED_AI_API_KEY`,
      чтобы мягко перейти на более короткий нейминг без breaking changes.
- Обновить комментарии в `.env.example` (если вводится alias), чтобы был единый рекомендуемый ключ.

### Этап 3. Модель в реестре `MEDIA_MODELS`

- Добавить новую запись (например, `Z_IMAGE_TURBO_LORA_WAVESPEED`):
    - `id: "wavespeed-ai/z-image/turbo-lora"` (или точный id по API endpoint),
    - `types: ["IMAGE"]`,
    - `provider: "wavespeed"`,
    - `supportsImageInput: false` (если делаем только text-to-image в первой итерации),
    - разумные лимиты prompt/pricing.
- Проверить отображение модели в клиентском списке доступных моделей через существующий `getAvailableModels()`.

### Этап 4. Реализация в `providers/wavespeed`

- Разделить реализацию внутри wavespeed на под-модули по типам задач:
    - `wavespeed/image.ts` — `z-image/turbo-lora`,
    - `wavespeed/video.ts` — текущий Kling O1 (вынести из перегруженного `media.ts`),
    - `wavespeed/shared.ts` — общие helper-методы (auth headers, status map, нормализация ошибок).
- В public factory (`createWavespeedProvider`) роутить логику по `params.model`:
    - image-модели -> image submit/status/result flow;
    - video-модели -> текущий flow.
- Сохранить единый контракт `MediaProvider`, без изменения сигнатур верхнего уровня.

### Этап 5. Небольшой рефакторинг структуры провайдеров (минимальный риск)

- Унифицировать внутреннюю структуру провайдеров до одного шаблона:
    - `<provider>/index.ts`
    - `<provider>/interfaces.ts`
    - `<provider>/<media-type-or-model-group>.ts`
- Для `kieai` и `laozhang` не делать большой переделки сейчас; только выровнять экспорт/нейминг там, где это мешает расширению.
- Не трогать бизнес-логику task-tracking и completion-handler в этой задаче, кроме совместимости с новой моделью.

### Этап 6. Интеграционные проверки

- Проверить сценарии:
    - submit задачи (`pending/processing`);
    - успешный `done` + сохранение файлов;
    - корректная ошибка при `401/402/403` и невалидных параметрах LoRA;
    - корректная работа без LoRA и с 1-3 LoRA.
- Проверить, что новый flow не ломает текущий `wavespeed` video и существующие `kieai/laozhang` модели.

### Этап 7. Тесты и наблюдаемость

- Добавить/обновить unit-тесты маппинга параметров `GenerateParams -> Wavespeed request`.
- Добавить тесты валидации LoRA-массива (max 3, `path`, `scale`).
- Проверить логирование:
    - без утечки API-ключа;
    - с request-id/model-id/status для дебага.

## Предлагаемая структура после точечного рефакторинга

```text
server/features/media/providers/
  interfaces.ts
  provider-manager.ts
  index.ts
  kieai/
    index.ts
    interfaces.ts
    unified-provider.ts
    ...
  wavespeed/
    index.ts
    interfaces.ts
    image.ts
    video.ts
    shared.ts
  laozhang/
    index.ts
    interfaces.ts
    media.ts
```

## Что делаем в V1 и что откладываем

### В V1 (обязательно)

- Подключение `z-image/turbo-lora` как image-модели.
- ENV-ключ и конфиг провайдера.
- Минимальный структурный рефакторинг внутри `wavespeed` (image/video split).
- Проверка end-to-end с результатом в файловом хранилище и статусами.

### V2 (после стабилизации)

- Расширенный UI/API контракт для передачи массива `loras`.
- Общий реестр capability-матрицы моделей (image/video/audio, input files, lora support).
- Более широкий рефакторинг `kieai/laozhang` в единую архитектурную схему без дублирования.

## Риски и меры

- Риск: разные response-форматы у Wavespeed endpoint-ов (video vs image).
  Мера: отдельные typed-ответы и отдельные submit/result адаптеры.

- Риск: перегрузка текущего `media.ts` и рост связности.
  Мера: немедленное разделение на `image.ts` и `video.ts`.

- Риск: breaking по env-ключам.
  Мера: fallback-стратегия (alias + обратная совместимость).

## Критерии готовности

- Модель `z-image/turbo-lora` видна в списке доступных моделей.
- Генерация image проходит end-to-end и сохраняет результат в текущую файловую систему проекта.
- Текущие модели `wavespeed` video и существующие провайдеры не регресснули.
- Логи и ошибки читаемы, ключи не светятся.
