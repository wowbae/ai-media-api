# План перехода на системный Payload-Mapping механизм

## Цель

Устранить класс проблем “запрос уходит в неверный endpoint/с неверным request body” для любых моделей/провайдеров в проекте `ai-media-api`, чтобы внешние нейросети (в т.ч. Wavespeed):

- принимали задачу (task создавался и появлялся в трекинге),
- отклоняли запрос только с понятной ошибкой валидации,
- получали строго “разрешённые” поля по схеме конкретного endpoint-а.

## Контекст: как это устроено сейчас

1. **Фронт** собирает payload через capability-ветки:
    - `src/components/media/chat-input/use-chat-input-submit.ts` добавляет поля в body `generateMedia` по флагам модели (например `supportsNegativePrompt`, duration options) и отдельным спец-веткам (WAN/LoRA).
2. **Бэкенд** принимает широкий контракт:
    - `server/features/media/interfaces.ts` (`GenerateParams`/`GenerateMediaRequest`) содержит много опциональных полей.
3. **Провайдер** выбирает endpoint и вручную собирает requestBody:
    - `server/features/media/providers/provider-manager.ts` выбирает провайдера по `MEDIA_MODELS[*].provider`.
    - внутри провайдера (например Wavespeed) payload собирается вручную по model key.
4. Из-за этого легко возникает разрыв “модель → конкретный внешний endpoint → поля request body”.
    - Симптомы: `invalid request body`, 4xx на submit, затем пользователь видит эффекты вроде “aborted”/не создаётся task.

## Принцип нового механизма

Сделать единую цепочку:
`modelKey` → (маппинг семейства) → (точный external endpoint) → (payload schema) → (typed payload builder) → (preflight validation) → `fetch`.

Ключевая идея: **payload keys и required fields должны определяться по схеме конкретного endpoint-а**, а не “предполагаться” через общий `GenerateParams` и набор опциональных полей.

## Что именно нужно добавить (server-side)

### 1) Registry: modelKey → endpoint + payload family

Создать централизованную таблицу соответствий (для каждого провайдера или общей структуры), например:

- `modelKey` (например `WAN_2_2_IMAGE_TO_VIDEO_WAVESPEED`)
- `externalEndpoint` (например `wavespeed-ai/wan-2.2/i2v-720p`)
- `payloadFamily` (например `wan2_2_i2v` или `wan2_2_i2v_lora`)
- `payloadSchema` (набор полей и их форматов)

Где хранить:

- можно в `server/features/media/providers/<provider>/model-mapping.ts`, либо в общем каталоге `server/features/media/payload/`.
- `MEDIA_MODELS` оставить “для UI/каталога”, а mapping-механизм сделать “для внешнего контракта”.

### 2) Payload Builder: payloadFamily → typed builder

Для каждой `payloadFamily` сделать отдельный builder:

- вход: `GenerateParams` (или узкий DTO модели)
- выход: **typed request body** ровно под этот endpoint

Пример ветвления:

- `wavespeed` video:
    - `wan2_2_i2v`: `{ image, prompt, duration, negative_prompt?, last_image?, seed? }`
    - `wan2_2_i2v_lora`: то же + `{ resolution?, loras? }`
- `kling` video:
    - отдельный typed request body, где допустим `images` + `safety_checker`

### 3) Preflight validation перед fetch

Минимально нужная runtime-валидация до отправки:

- обязательность полей (например `image`, `prompt`)
- диапазоны/enum:
    - для WAN 2.2 duration: только `[5, 8]`
    - seed: integer и корректные допустимые значения (если docs задают)
- cardinality input:
    - WAN 2.2 I2V: 1 входное изображение
    - WAN 2.2 LoRA/I2V-Lora: 1 входное + optional last_image (если реализовано)
- запрет unknown keys:
    - payload builder должен строить объект из “белого списка” полей, чтобы unknown keys не утекали наружу

Результат preflight:

- либо “ок, fetch можно делать”
- либо ошибка вида `{ code: 'PAYLOAD_VALIDATION', message, details }`

### 4) Error mapping в единый формат

Сейчас ошибки проходят как `Error` строкой. Для диагностики и UX стоит стандартизировать:

- `providerName`, `modelKey`, `externalEndpoint`
- `validationPhase`: `preflight` | `submit`
- `details` (какое поле нарушило контракт)

## Как синхронизировать фронт, чтобы он не угадывал

Фронт сейчас содержит capability-флаги (через `model-config` и settings). Но этого недостаточно: “capability” != “точный endpoint contract”.

Варианты системной синхронизации (в порядке приоритета):

1. **Backend-first**: фронт продолжает показывать UI опции, но backend становится единственным источником корректности payload.
    - Фронт получает понятные errors и подсвечивает поле/действие.
2. **Shared contract (частично)**: выносить в shared логику:
    - допустимые duration, max inputFiles, наличие seed/negative_prompt/loras
    - но формальные схемы payload still должны жить на backend (потому что endpoit-ключи всегда vendor-specific).

## План миграции по этапам

### Этап 1. Ввести базовую архитектурную прослойку (каркас)

1. Добавить слой “payload mapping” внутри `server/features/media/providers/<provider>`:
    - mapping registry
    - typed builders (пока 1-2 payload family)
    - preflight validation
2. Включить слой как “новый путь” параллельно старому, чтобы не сломать текущие модели.
3. В логах фиксировать:
    - modelKey, endpoint, payloadSchemaFamily, preflight status

### Этап 2. Покрыть Wavespeed video family (как эталон)

1. Привести wavespeed video paths к contract-driven сборке payload.
2. Обязательно проверить сценарии:
    - WAN 2.2 `i2v-720p` (без `images`, без `safety_checker`)
    - WAN 2.2 `image-to-video-lora` (payload содержит `loras`)
    - Kling (не ломаем отдельной веткой)

### Этап 3. Расширять на остальных провайдеров и model families

Последовательно переносить:

- `laozhang` (если есть endpoint-specific поля)
- `gptunnel`
- `kieai` (если есть разные контракты по mode/model type)

### Этап 4. Удалить старые “ручные” payload builders

Когда все families покрыты:

- старые ветки с ручным requestBody постепенно удаляются
- остаётся единая архитектура mapping → builder → preflight → fetch

## Definition of Done (критерии готовности)

1. Для всех моделей в проекте:
    - payload соответствует “белому списку” конкретного внешнего endpoint-а
    - unknown/лишние поля не отправляются
2. Для проблемных классов:
    - `400 invalid request body` больше не возникает “по причине полей”
3. В логах и UI:
    - если задача не создаётся — ошибка понятная (что именно не так) и не превращается в хаос “aborted”.

## Риски и меры снижения

1. **Рост объёма кода**: builders могут стать большими.
    - Мера: разносить по payloadFamily, держать schema и builders компактными, использовать helper-утилиты.
2. **Регрессии по уже работающим моделям**:
    - Мера: включать новый путь фиче-флагом и покрывать хотя бы manual smoke по каждой family.
3. **Неполнота документации vendor-ов**:
    - Мера: preflight + submit-error parsing, логирование unknown keys/fields, итерации по фактическим 4xx.

## Ссылка на примеры контрактов Wavespeed WAN 2.2

- `Wan 2.2 I2V 720p`: `image`, `prompt`, `duration`, `resolution`, `seed`, optional `negative_prompt`, `last_image`
- `Wan 2.2 Image-to-video LoRA`: то же + `loras[]` (и/или noise-specific loras)
