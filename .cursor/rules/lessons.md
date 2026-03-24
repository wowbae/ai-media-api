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
