## 2026-03-23 - Unified Kie.ai integration

- Context: миграция с множества Kie.ai провайдеров на `unified-provider` и обновление polling логики.
- Mistake: `unified-provider` был реализован с сигнатурами `checkTaskStatus(taskId, model)` и `getTaskResult(taskId, model)`, что ломало общий контракт `MediaProvider`.
- Root cause: локальная оптимизация под внутреннюю модель без учета интерфейса слоя абстракции.
- Prevention rule: перед рефакторингом провайдера сначала закреплять API-контракт на уровне `providers/interfaces.ts` и проверять совместимость всех реализаций через `tsc --noEmit`.
- Checklist item: "Для каждого нового провайдера/рефакторинга провайдера: сигнатуры строго совпадают с `MediaProvider` + есть typecheck-подтверждение".

## 2026-03-23 - Webhook payload compatibility

- Context: подключение callback URL для Kie.ai и обработка webhook в `completion` route.
- Mistake: изначально webhook обработчик требовал `requestId`, хотя провайдер присылает только `taskId` + `state`.
- Root cause: предположение о формате payload без проверки фактического контракта провайдера.
- Prevention rule: webhook handlers должны иметь fallback lookup по `taskId` и принимать разные форматы статусов (`state`, `status`).
- Checklist item: "Перед релизом webhook: проверить минимум 2 payload-варианта (с requestId и без него) и пройти сценарии success/fail".

## 2026-03-23 - Interface bloat after consolidation

- Context: после перехода на `unified-provider` в `kieai/interfaces.ts` оставался большой набор model-specific типов удаленных провайдеров.
- Mistake: сохранение legacy-типов после удаления legacy-реализаций, что увеличивало шум и риск ложных зависимостей.
- Root cause: рефакторинг логики был завершен раньше, чем cleanup контрактов.
- Prevention rule: после удаления модуля обязательно сокращать связанные interface-файлы до фактически используемых контрактов.
- Checklist item: "После cleanup реализации: `rg` по старым типам должен вернуть 0 совпадений".

## 2026-03-23 - Duplicate interface key in frontend DTO

- Context: общий `tsc --noEmit` падал из-за `Duplicate identifier 'videoQuality'` в `GenerateMediaRequest`.
- Mistake: одно и то же поле было объявлено дважды внутри одного интерфейса.
- Root cause: ручное объединение полей без финальной проверки на дубликаты в типах запроса.
- Prevention rule: после правок DTO всегда запускать проектный `tsc --noEmit`, даже если изменения локально выглядят тривиальными.
- Checklist item: "Перед завершением: проверить интерфейсы запросов на duplicate keys".

## 2026-03-23 - Planning before provider refactor

- Context: подготовка плана внедрения новой модели `z-image/turbo-lora` с потенциальным рефакторингом структуры провайдеров.
- Mistake: легко уйти в большой cross-provider рефакторинг в рамках одной функциональной задачи (добавление одной модели).
- Root cause: смешение двух целей: feature delivery и архитектурная унификация всего provider-слоя.
- Prevention rule: при добавлении одной модели применять "минимальный безопасный рефакторинг" только внутри целевого провайдера, а глобальную унификацию выносить в отдельный этап.
- Checklist item: "Перед стартом: разделить scope на V1 (feature) и V2 (архитектурное улучшение), зафиксировать границы изменений".

## 2026-03-23 - Provider task routing memory

- Context: добавление image-модели в уже существующий async-provider Wavespeed, где раньше был только video-flow.
- Mistake: если не хранить тип задачи (`image`/`video`) в момент создания task, далее статус/результат приходится определять через try/catch эвристики.
- Root cause: отсутствие явной связи `taskId -> handler` внутри провайдера.
- Prevention rule: для multi-model провайдера сохранять lightweight routing state по `taskId` сразу после `generate()`, и использовать его в `checkTaskStatus/getTaskResult`.
- Checklist item: "Для каждого multi-model провайдера: есть явный роутинг taskId к обработчику, без fallback на исключения как на control flow".

## 2026-03-23 - Stable fallback config in UI

- Context: после добавления новой модели в backend, при ее выборе UI падал с `Maximum update depth exceeded`.
- Mistake: `getModelSettingsConfig()` возвращал новый объект `{}` для неизвестной модели на каждом рендере, а `useEffect` зависел от `config` и вызывал `setState`.
- Root cause: нестабильная ссылка fallback-объекта + неполная синхронизация frontend model unions/configs с backend.
- Prevention rule: fallback-конфиги должны быть константой со стабильной ссылкой, и при добавлении модели обновлять backend + frontend model registry в одном changelist.
- Checklist item: "Новая модель добавлена синхронно в backend config, frontend type union, model-config, settings-config и icon map; fallback объекты не создаются inline".

## 2026-03-23 - Feature completeness for new model

- Context: после внедрения `Z_IMAGE_TURBO_LORA_WAVESPEED` backend поддерживал `loras`, но в ChatInput не было полей для ввода LoRA.
- Mistake: интеграция новой модели завершена только на уровне API/провайдера без обязательного UI surface для model-specific параметров.
- Root cause: проверка done-критериев была сфокусирована на transport и status flow, а не на полном пользовательском пути.
- Prevention rule: для каждой новой модели с уникальными параметрами проверять end-to-end цепочку: type -> settings UI -> submit payload -> backend validation.
- Checklist item: "Перед закрытием задачи по модели: есть ли в интерфейсе поля для всех пользовательских параметров модели (не только в API-контракте)".

## 2026-03-23 - Model-specific file upload flow

- Context: для LoRA нужен не только ручной `path`, но и удобная загрузка `.safetensors` из UI.
- Mistake: пытаться переиспользовать общий image/video attachment pipeline для другого типа сущности приводит к несовместимости mime/хранилища.
- Root cause: смешение доменов "input media" и "model asset (LoRA)" в одном upload-потоке.
- Prevention rule: для model assets делать отдельный endpoint и отдельный UI control, который возвращает готовый `path` для payload.
- Checklist item: "Если параметр модели — внешний asset, есть ли отдельный upload flow с явным контрактом `{ file -> provider-path }`".

## 2026-03-23 - Server-side asset library UX

- Context: пользовательский запрос на хранение LoRA на сервере и выбор из списка без повторного drag/drop в чат.
- Mistake: initial upload feature решал только одноразовую загрузку, но не reusable-библиотеку ассетов.
- Root cause: акцент на transport вместо сценария повторного использования ассетов между генерациями.
- Prevention rule: для любых "тяжелых" файлов добавлять библиотечный слой (list + upload + select) как часть первого релиза.
- Checklist item: "Новый asset flow завершен только если есть загрузка, серверное хранение и повторный выбор из UI списка".

## 2026-03-23 - Dense controls readability

- Context: в блоке LoRA controls были собраны в одну строку и выглядели перегруженно.
- Mistake: попытка уместить select + несколько CTA в один row без mobile-first разбиения.
- Root cause: focus на функциональность без отдельной проверки визуальной плотности и сканируемости.
- Prevention rule: для form-block с 3+ действиями использовать двухэтапный layout (выбор/добавление + загрузка) и избегать long-row controls.
- Checklist item: "Новый UI-блок проверен на читаемость: нет перегруженной одной строки с несколькими CTA".

## 2026-03-23 - Mode isolation planning for private route

- Context: проектирование отдельного режима `/ai-model` с приватным UI, отдельной библиотекой медиа и новыми prompt-полями.
- Mistake: есть риск ограничиться только фронтовым разделением по роуту/цвету без серверного признака режима в данных.
- Root cause: недооценка того, что библиотека и SSE живут на уровне backend/data, а не только UI.
- Prevention rule: для любого "отдельного режима" сначала вводить явный `appMode` в контракты, хранение и фильтрацию API, и только потом дорабатывать UI.
- Checklist item: "Если появляется новый режим интерфейса: проверить изоляцию на 3 уровнях — БД, API выдача, SSE-события".

## 2026-03-23 - Reuse existing LoRA path

- Context: обновление плана для `/ai-model` с учетом передачи LoRA в Wavespeed `z-image/turbo-lora`.
- Mistake: можно ошибочно планировать новый UI/контракт для LoRA, хотя в проекте уже есть рабочая реализация на фронте и backend.
- Root cause: недостаточная проверка текущего кода перед расширением требований.
- Prevention rule: перед добавлением нового поля/блока UI сначала делать "reuse-аудит" по проекту (UI, API, provider) и только затем принимать решение о новом интерфейсе.
- Checklist item: "Для каждого нового требования: подтвердить, есть ли уже реализованный поток, и зафиксировать re-use в плане отдельным пунктом".

## 2026-03-23 - Public mode must be end-to-end

- Context: внедрение `/ai-model` без логина с отдельной библиотекой и prompt enhancement.
- Mistake: легко ограничиться только роутом на фронте и забыть, что `appMode` должен проходить через все API (chats/files/requests/models/generate).
- Root cause: фокус на UI вместо сквозного контракта данных.
- Prevention rule: для каждого нового режима фиксировать единый параметр режима (`appMode`) и проверять его прохождение по цепочке: create chat -> generate -> store settings -> list/read endpoints -> model list.
- Checklist item: "Перед завершением режима: проверить изоляцию данных в обе стороны (default не видит ai-model и ai-model не видит default)".

## 2026-03-23 - Multi-prompt delimiter contract

- Context: добавление batch-генерации по разделителю `*` и карусели в prompt enhancement.
- Mistake: при внедрении split-логики легко оставить ее только на фронте или только в enhancer-логике, что дает непредсказуемый UX.
- Root cause: отсутствие единого контракта "как интерпретируется `*`" в двух потоках (ручной ввод и авто-enhance).
- Prevention rule: при поддержке multi-prompt разделителя синхронно обновлять и submit-flow, и prompt-enhancer-инструкции, и явно логировать число подзапросов.
- Checklist item: "Если появился разделитель батча: проверить сценарии 1 prompt, 2+ prompt, пустые сегменты между разделителями".

## 2026-03-23 - Provider-native status URL priority

- Context: задачи Wavespeed успешно создавались, но статус-поллинг падал с `task not found` при проверке через `/predictions/{id}`.
- Mistake: после submit использовался только синтетический endpoint по `taskId`, игнорируя `data.urls.get`, который возвращает сам провайдер.
- Root cause: предположение о едином формате result endpoint для всех моделей/версий API вместо использования provider-native ссылки из ответа.
- Prevention rule: для async-провайдеров приоритетно хранить и использовать result/status URL из submit-ответа; `taskId`-endpoint оставлять только как fallback.
- Checklist item: "После интеграции async API: проверить, что polling идет по URL из submit-response, если он доступен".

## 2026-03-23 - Failed status must not throw in poller

- Context: у Wavespeed задачи реально переходили в `failed`, но трекер продолжал цикл проверок вместо финализации запроса.
- Mistake: провайдер в `checkTaskStatus` бросал exception при `status=failed`, из-за чего общий polling-контур воспринимал это как временную ошибку проверки.
- Root cause: смешение бизнес-статуса задачи (`failed`) и транспортной ошибки запроса (exception).
- Prevention rule: в `checkTaskStatus` возвращать `{ status: "failed", error }` как нормальный результат; exception оставлять только для network/protocol сбоев.
- Checklist item: "Для каждого async провайдера: `status=failed` проходит через единый failure-handler без retry-loop по исключению".

## 2026-03-23 - Ratio vs dimension contract mismatch

- Context: задачи `Z_IMAGE_TURBO_LORA_WAVESPEED` падали мгновенно со строкой `invalid literal for int() with base 10: '9:16'`.
- Mistake: в поле `size` отправлялся аспект-рейшио формат (`9:16`), тогда как API ожидает размер в пикселях (`width*height`).
- Root cause: перенос frontend-представления формата (`a:b`) напрямую в provider payload без адаптации под контракт внешнего API.
- Prevention rule: для каждого провайдера держать явный mapping UI format -> provider payload format и валидировать его на реальном failed-кейсе.
- Checklist item: "Перед релизом новой модели: проверить, что числовые параметры (`size`, `duration`, `seed`) передаются в нативном для API формате".

## 2026-03-24 - Model-specific input cardinality guard

- Context: добавление Grok Imagine методов (`image-to-image`, `image-to-video`) в `/ai-model`, где endpoint принимает только 1 входное изображение.
- Mistake: полагаться только на backend-провайдер валидацию без раннего UI-check приводит к лишним failed task и плохому UX.
- Root cause: отсутствие явного контракта "сколько файлов допускается" в submit-flow для новой модели.
- Prevention rule: при подключении новой модели сразу фиксировать cardinality guard в `use-chat-input-submit` (min/max input files) и дублировать hard-check в provider mapping.
- Checklist item: "Для новой модели проверено: ограничение входных файлов валидируется и на фронте, и на backend до отправки задачи".

## 2026-03-24 - Parse resultJson in Kie task detail

- Context: Grok Imagine задачи доходили до `success`, но завершение падало с `Нет результатов задачи` в `getTaskResult`.
- Mistake: extractor искал только `resultUrls`/`result.url` в верхнем уровне ответа и не обрабатывал `data.resultJson` (JSON-строка).
- Root cause: перенос общего extractor-а на новую модель без проверки фактического payload `recordInfo` для этого family.
- Prevention rule: для каждой новой модели Kie проверять `recordInfo` на живом taskId и добавлять parser для `resultJson` как fallback path.
- Checklist item: "После интеграции модели: вручную проверить минимум 1 success payload и убедиться, что extractor возвращает URL без доп. API вызовов".

## 2026-03-24 - Dual whitelist sync for app mode

- Context: добавление моделей в `/ai-model` делается через отдельные whitelist-файлы на backend и frontend.
- Mistake: легко обновить только одну сторону (server или client) и получить "модель есть в API, но не в UI" или наоборот.
- Root cause: дублирование констант режима (`AI_MODEL_ALLOWED_MODELS`) в двух местах без единой точки истины.
- Prevention rule: при каждом изменении набора ai-mode моделей синхронно править `server/features/media/app-mode.ts` и `src/lib/app-mode.ts` в одном changelist.
- Checklist item: "После изменения whitelist: проверить `/media/models?appMode=ai-model` и отображение модели в селекторе на фронте".

## 2026-03-24 - Same-provider model family branching

- Context: у Wavespeed в одном провайдере появились две image-модели (`turbo-lora` и `turbo/image-to-image`) с разными payload полями.
- Mistake: обрабатывать всю image-ветку одним request builder-ом приводит к неверному телу запроса для второй модели.
- Root cause: предположение, что "один provider = один payload shape" для всех моделей family.
- Prevention rule: внутри provider делать явное ветвление по model key и отдельные request builder-функции на каждый shape.
- Checklist item: "При добавлении модели в существующий provider: проверить endpoint + required поля payload отдельно для каждой model key".

## 2026-03-24 - Keep endpoint suffix exact

- Context: для `ai-model` нужно было использовать точный endpoint Wavespeed `wavespeed-ai/z-image-turbo/image-to-image-lora`.
- Mistake: оставить близкий, но другой endpoint (`.../image-to-image`) из предыдущей интеграции и считать его эквивалентным.
- Root cause: отсутствие явной сверки model id из требований с server config и provider constants одновременно.
- Prevention rule: при обновлении конкретной external model id менять и проверять оба слоя в одном PR: `server/features/media/config.ts` + provider endpoint constants.
- Checklist item: "После правки model id: `rg` по старому id не возвращает совпадений, а новый id встречается в config и provider".

## 2026-03-24 - LoRA support must be model-family wide

- Context: после перехода на `Z_IMAGE_TURBO_IMAGE_TO_IMAGE_WAVESPEED` endpoint с `image-to-image-lora` UI и submit-flow продолжали передавать LoRA только для `Z_IMAGE_TURBO_LORA_WAVESPEED`.
- Mistake: ограничить фичу LoRA одним model key, хотя у второй модели того же family контракт тоже поддерживает `loras`.
- Root cause: локальная условная проверка по одному ключу в `chat-input`/`use-chat-input-submit` без сверки с provider-level contract.
- Prevention rule: для shared provider feature (например, LoRA) вводить capability-проверку на весь family моделей и синхронно обновлять UI gate + request payload + provider request builder.
- Checklist item: "Если feature общая для family: проверено 3 уровня — UI видимость, фронтовый payload include, backend mapping поля".

## 2026-03-24 - Ai-mode model addition requires dual sync

- Context: добавление новой модели `wavespeed-ai/wan-2.2/image-to-video-lora` в `/ai-model` route.
- Mistake: легко обновить только `MEDIA_MODELS` и забыть синхронно обновить allowlist и типы модели на frontend/backend.
- Root cause: модель хранится в нескольких слоях (server config, mode whitelist, shared API types), но нет compile-time единой точки истины.
- Prevention rule: при добавлении модели фиксировать change-set минимум из 4 точек: `server/features/media/config.ts`, `server/features/media/app-mode.ts`, `src/lib/app-mode.ts`, типы `MediaModel` на client/server.
- Checklist item: "После добавления модели: проверить, что она видна в `/models?appMode=ai-model` и не дает TS-ошибок в payload типах".

## 2026-03-24 - Lora-capable model requires UI+submit sync

- Context: пользователь просит "добавить LoRA на фронте" для новой модели `WAN_2_2_IMAGE_TO_VIDEO_LORA_WAVESPEED`.
- Mistake: включить модель только в список/селекторах и забыть два критичных условия: показ LoRA-блока в UI и прокидку `loras` в `generateMedia` payload.
- Root cause: LoRA flow завязан на model-specific guards в двух разных местах (`chat-input.tsx` и `use-chat-input-submit.ts`).
- Prevention rule: при подключении каждой LoRA-модели проверять парой: `isLoraEnabled...` для рендера контролов + условие отправки `loras` в submit-flow.
- Checklist item: "Для новой LoRA-модели: есть блок ввода LoRA в UI и поле `loras` реально уходит в network payload".

## 2026-03-24 - New Wavespeed edit model must reuse image-to-image contract

- Context: добавление `wavespeed-ai/qwen-image-2.0-pro/edit` в `ai-model` и существующий Wavespeed image-provider.
- Mistake: если добавить модель только в список доступных, роут `/models` покажет ее, но `generate()` отправит запрос в неверный endpoint/payload.
- Root cause: разрыв между model registry (`MEDIA_MODELS`) и runtime-ветвлением в `providers/wavespeed/image.ts`.
- Prevention rule: для каждой новой модели внутри существующего provider-family синхронно обновлять 3 слоя: registry (config), mode whitelist, provider branching (endpoint + request builder).
- Checklist item: "После добавления модели провайдера: проверить, что `isImageModel`/`isVideoModel` и выбор endpoint учитывают новый model key".

## 2026-03-24 - Remove model from ai-mode in both whitelists

- Context: удаление `grok image edit` из маршрута `/ai-model`.
- Mistake: при удалении модели легко изменить только backend allowlist и оставить frontend allowlist прежним, из-за чего UI может показывать недоступную модель.
- Root cause: whitelist режима хранится в двух отдельных файлах (`server/features/media/app-mode.ts` и `src/lib/app-mode.ts`) без compile-time связки.
- Prevention rule: любое удаление/добавление модели для `/ai-model` делать единым change-set в backend + frontend allowlist с обязательной typecheck-проверкой.
- Checklist item: "После правки ai-mode whitelist: модель отсутствует и в `/media/models?appMode=ai-model`, и в клиентском списке моделей".

## 2026-03-24 - Wavespeed edit expects images array

- Context: генерация для `wavespeed-ai/qwen-image-2.0-pro/edit` падала с `invalid request body: property "images" is missing`.
- Mistake: в image-to-image builder отправлялось только поле `image`, без обязательного `images` массива для edit endpoint.
- Root cause: перенос payload shape от другой модели family без сверки required полей для конкретного endpoint.
- Prevention rule: при добавлении модели в существующий provider-family фиксировать request contract отдельно по endpoint и проверять обязательные поля по фактическому 4xx ответу API.
- Checklist item: "Для каждого image-to-image/edit endpoint: в payload есть `images` при требовании API, плюс smoke-проверка реального submit запроса".

## 2026-03-24 - Failed status can contain usable results

- Context: в `ai-model` для `Nano Banana 2 (kieai-unified)` фронт показывал `[... ] No images found ... policy`, хотя фактический результат мог быть доступен.
- Mistake: `checkTaskStatus` безусловно доверял `state=failed` и помечал задачу как `FAILED`, даже если в payload уже были `resultUrls`.
- Root cause: опора только на provider state без cross-check фактических output URL в статус-ответе.
- Prevention rule: в async-провайдерах финальный статус определять по комбинации `state + presence of outputs`; если есть валидные result URLs, не отдавать `failed`.
- Checklist item: "Для каждого provider poller: проверено правило `failed + outputs => done` (или явная бизнес-альтернатива) и отсутствие ложных FAIL в UI".

## 2026-03-24 - Ai-mode replacement needs provider routing sync

- Context: замена модели в `/ai-model` с `SEEDREAM_4_5_EDIT_KIEAI` на `bytedance/seedream-v4.5/edit-sequential` (`SEEDREAM_V4_5_EDIT_SEQUENTIAL_WAVESPEED`).
- Mistake: при простой замене allowlist можно забыть добавить новую модель в runtime-роутинг провайдера (`isImageModel`) и в model registry, из-за чего модель отображается в UI, но уходит в неверный handler.
- Root cause: модель подключается в нескольких независимых слоях (типы, registry, mode whitelist, provider branching), а изменение в одном слое не гарантирует работоспособность всего потока.
- Prevention rule: при замене модели в режиме (`instead of`) делать единый change-set из 5 точек: `server/interfaces` + `server/config` + backend/frontend allowlist + provider routing (`isImageModel`/endpoint branch).
- Checklist item: "После замены модели в режиме: модель видна в `/media/models?appMode=ai-model`, отправляется в корректный provider endpoint и проходит локальные проверки без новых lint-ошибок".

## 2026-03-24 - Model-specific minimum pixel constraints

- Context: `bytedance/seedream-v4.5/edit-sequential` в Wavespeed принимал submit, но сразу возвращал `failed` со строкой `image size must be at least 3686400 pixels` при `size=1024*1024`.
- Mistake: переиспользовать общий mapping `aspectRatio -> size` от других image-моделей без проверки минимального порога пикселей у конкретного endpoint.
- Root cause: предположение, что единые размеры подходят для всего provider-family, хотя ограничения валидатора у моделей отличаются.
- Prevention rule: для каждой новой модели фиксировать отдельную таблицу размеров, если API требует min/max по пикселям; валидировать минимум одним реальным submit+poll кейсом.
- Checklist item: "После интеграции image-модели: проверить, что default `size` проходит provider validation (нет instant-fail на первом poll)".

## 2026-03-24 - Trainer model needs non-media attachment path

- Context: добавление `wavespeed-ai/z-image-lora-trainer`, где вход — ZIP-архив датасета, а не image/video файл.
- Mistake: пытаться прогнать `.zip` через обычный media attachment pipeline (preview + imgbb + upload-user-media), который предназначен только для image/video.
- Root cause: смешение двух разных доменов входных данных: media inputs для генерации и dataset asset для тренировки.
- Prevention rule: для trainer/asset-моделей делать явный model-specific upload path: отдельная mime-валидация, передача base64/URL напрямую в provider и отключение media-only обработчиков.
- Checklist item: "Если модель принимает архив/asset: проверены 3 шага — UI принимает нужный mime, submit отправляет asset в payload, provider преобразует в provider-compatible URL/format".

## 2026-03-24 - Preflight remote LoRA URL before provider submit

- Context: `Z-Image Turbo LoRA` падал в Wavespeed с `Failed to get remote file properties ... 404`, когда `loras[].path` указывал на недоступный URL.
- Mistake: отправлять задачу во внешний API без локальной проверки доступности LoRA-файла по URL.
- Root cause: отсутствие preflight-валидации внешнего asset URL в provider request pipeline.
- Prevention rule: перед submit задач с remote assets выполнять preflight доступности URL (HEAD, fallback GET) и прерывать запрос с явной диагностикой при 4xx/5xx.
- Checklist item: "Для каждого remote asset в payload есть preflight-check URL до вызова внешнего провайдера".

## 2026-03-24 - Avoid host-bound asset URLs in local tunnel environments

- Context: после смены ngrok домена генерация с LoRA продолжала использовать старый absolute URL, сохраненный ранее в `loras[].path`, и падала с 404.
- Mistake: хранить и переиспользовать host-bound URL для локальных ассетов вместо стабильного относительного пути.
- Root cause: URL формировался с текущим `MEDIA_PUBLIC_BASE_URL` на момент upload/list и сохранялся как абсолютный, а tunnel-host меняется между сессиями.
- Prevention rule: для локальных ассетов возвращать/хранить относительный путь (`/media-files/...`) и нормализовать любые абсолютные URL с этим префиксом к текущему `MEDIA_PUBLIC_BASE_URL` перед provider submit.
- Checklist item: "Если asset лежит локально: в контракте хранится относительный path, а публичный host подставляется только перед внешним API вызовом".

## 2026-03-24 - Model flags should be explicit in typed provider payload

- Context: для проверки гипотезы по деградации изображений понадобилось отключить safety checker в Wavespeed image-моделях.
- Mistake: feature-флаг провайдера не был отражен в typed интерфейсе payload, из-за чего изменение могло остаться ad-hoc и неочевидным.
- Root cause: неполная фиксация model-specific параметров в `WavespeedImageTaskRequest`.
- Prevention rule: при любом model-specific флаге сначала расширять тип интерфейса запроса, затем синхронно прокидывать флаг во все релевантные request builders.
- Checklist item: "Новый provider-флаг добавлен и в интерфейс, и в каждый builder соответствующей model family".

## 2026-03-24 - Trainer params need end-to-end contract sync

- Context: добавление `triggerWord` для `Z-Image LoRA Trainer` требовало изменения UI поля, submit payload, API DTO и provider params.
- Mistake: легко ограничиться только UI и забыть добавить поле в `GenerateMediaOptions/GenerateParams`, что приводит к потере параметра до provider.
- Root cause: trainer-параметры проходят через несколько слоев типизации без единого shared DTO.
- Prevention rule: для каждого нового model-specific параметра фиксировать change-set по всей цепочке: frontend request type -> submit hook -> backend request type -> generation options -> provider params.
- Checklist item: "Новый параметр модели присутствует в 5 точках цепочки и покрыт runtime валидацией на route уровне".

## 2026-03-24 - Do model-specific validation after model resolution

- Context: `Z-Image LoRA Trainer` в Wavespeed не требует `prompt`, но backend делал общую раннюю проверку `prompt обязателен`, из-за чего тренировка падала до provider call.
- Mistake: применять общую валидацию обязательных полей до определения выбранной модели и ее контракта.
- Root cause: порядок валидации был построен вокруг generic flow, без исключений для trainer endpoints.
- Prevention rule: сначала определять `selectedModel`, затем выполнять model-specific валидации (required/optional поля) в роуте.
- Checklist item: "Для каждого endpoint family есть явный блок model-specific validation после resolve модели".

## 2026-03-24 - Stop retry loop on deterministic provider errors

- Context: TaskTracking продолжал polling после ошибки `task not found`, создавая шум в логах и лишние запросы к провайдеру.
- Mistake: обрабатывать все исключения в poller как временные и всегда планировать повторную проверку.
- Root cause: отсутствие классификации ошибок на recoverable и terminal в трекере задач.
- Prevention rule: для детерминированных ошибок (`not found`, `invalid task id`, и т.п.) делать fail-fast: останавливать tracking и переводить запрос в `FAILED`.
- Checklist item: "В poller есть явный terminal-error branch, который не re-schedule'ит задачу".

## 2026-03-24 - Добавить safety_checker: false во все POST-запросы к Wavespeed

- Context: Wavespeed включает safety checker по умолчанию. image.ts уже имел `safety_checker: false`, но video.ts (`generateVideo` requestBody) был без него.
- Mistake: при добавлении нового провайдера/хэндлера не копировать все флаги из уже существующих хэндлеров того же провайдера.
- Root cause: video и image хэндлеры разрабатывались отдельно, флаг не был перенесён.
- Prevention rule: при добавлении нового model handler для провайдера — сверять payload с уже реализованными хэндлерами того же провайдера и проверять все provider-level флаги (safety_checker, enable_safety_checker и т.п.).
- Checklist item: "Каждый новый Wavespeed POST payload содержит `safety_checker: false`".

## 2026-03-24 - Не использовать один video endpoint для всех Wavespeed моделей

- Context: запросы для `WAN_2_2_IMAGE_TO_VIDEO_LORA_WAVESPEED` уходили в `kwaivgi/kling-video-o1-std/reference-to-video`, потому что в `video.ts` был один захардкоженный endpoint.
- Mistake: делать общий handler с фиксированным endpoint для семейства моделей, где у каждой модели свой API путь.
- Root cause: в video provider отсутствовал resolver endpoint по `params.model`.
- Prevention rule: в multi-model provider всегда иметь явный `resolveEndpoint(model)` и покрывать новые модели в switch/if до релиза.
- Checklist item: "При добавлении новой видео-модели проверен runtime endpoint в логах и он совпадает с `config.id` модели".

## 2026-03-24 - Обрабатывать aborted как отмену, а не как generic ошибку

- Context: в UI приходила ошибка `was aborted`, но пользователь видел общий alert "Ошибка генерации", что выглядело как падение сервиса.
- Mistake: не различать transport-level cancellation (`AbortError`, aborted signal) и реальные server/provider ошибки.
- Root cause: в `use-chat-input-submit` catch-блок обрабатывал все исключения одинаково.
- Prevention rule: выделять abort-like ошибки в отдельную ветку обработки: показывать мягкое сообщение и разрешать retry без тревожного alert.
- Checklist item: "В async submit-потоке есть `isAbortLikeError` ветка до generic error handling".

## 2026-03-24 - Держать ID модели синхронизированным между registry и provider endpoint

- Context: WAN 2.2 endpoint был заменен на `wavespeed-ai/wan-2.2/i2v-720p`, но такой change требует правки в двух местах: model config (`id`) и runtime endpoint resolver.
- Mistake: менять только display/config часть или только provider-часть.
- Root cause: разнесенная ответственность между `config.ts` и `wavespeed/video.ts`.
- Prevention rule: при смене vendor model id проверять и обновлять одновременно `MEDIA_MODELS[*].id` + provider endpoint constants.
- Checklist item: "После смены id модели есть 2/2 совпадения: registry id == runtime endpoint".

## 2026-03-24 - Учитывать model-specific ограничения duration

- Context: Wavespeed WAN 2.2 вернул `invalid request body` с ошибкой по `duration`, потому что модель принимает только `[5,8]`, а общий video-mapper отправлял значения 3..10.
- Mistake: использовать один generic validator/mapper для параметра, который имеет более строгие ограничения у конкретной модели.
- Root cause: отсутствие model-specific нормализации `duration` в `wavespeed/video.ts` и слишком широкий список duration в UI для WAN.
- Prevention rule: для каждого нового video endpoint проверять допустимые enum/диапазоны и делать отдельный mapper + UI options per model.
- Checklist item: "Для модели с особыми лимитами значения параметров согласованы в 2 местах: backend mapper и frontend settings".

## 2026-03-25 - Strip image metadata before save+Telegram

- Context: сервис сохранял сгенерированные `image/jpeg`/`image/png` и затем отправлял/загружал их (imgbb -> Telegram), но очистка метаданных не была встроена в единый пайплайн сохранения.
- Mistake: при гибридном сценарии загрузки в imgbb использовался исходный in-memory buffer, а не уже очищенный артефакт, из-за чего метаданные могли сохраниться.
- Root cause: разрыв ответственности между "writeFile в хранилище" и последующей "upload/send" стадиями (downstream не гарантировал, что работает с очищенной версией).
- Prevention rule: для любого генерируемого `IMAGE` делайте очистку метаданных _до_ сохранения в диск как point-of-truth, а все downstream-операции (imgbb/Telegram) должны брать данные из этого сохраненного артефакта.
- Checklist item: "Очистка запускается в saveBufferToFile для jpeg/png, а upload в imgbb читает из сохраненного пути (savedFile.path), не из исходного буфера."
