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

## 2026-03-23 - Planning before provider refactor

- Context: подготовка плана внедрения новой модели `z-image/turbo-lora` с потенциальным рефакторингом структуры провайдеров.
- Mistake: легко уйти в большой cross-provider рефакторинг в рамках одной функциональной задачи (добавление одной модели).
- Root cause: смешение двух целей: feature delivery и архитектурная унификация всего provider-слоя.
- Prevention rule: при добавлении одной модели применять "минимальный безопасный рефакторинг" только внутри целевого провайдера, а глобальную унификацию выносить в отдельный этап.
- Checklist item: "Перед стартом: разделить scope на V1 (feature) и V2 (архитектурное улучшение), зафиксировать границы изменений".

## 2026-03-23 - Mode isolation planning for private route

- Context: проектирование отдельного режима `/ai-model` с приватным UI, отдельной библиотекой медиа и новыми prompt-полями.
- Mistake: есть риск ограничиться только фронтовым разделением по роуту/цвету без серверного признака режима в данных.
- Root cause: недооценка того, что библиотека и SSE живут на уровне backend/data, а не только UI.
- Prevention rule: для любого "отдельного режима" сначала вводить явный `appMode` в контракты, хранение и фильтрацию API, и только потом дорабатывать UI.
- Checklist item: "Если появляется новый режим интерфейса: проверить изоляцию на 3 уровнях — БД, API выдача, SSE-события".
