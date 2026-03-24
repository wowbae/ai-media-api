# Task Todo

## 2026-03-24

- [x] Удалить `GROK_IMAGINE_IMAGE_TO_IMAGE_KIEAI` из allowlist режима `/ai-model` (backend + frontend sync).
- [x] Проверить типизацию после правки allowlist.
- [x] Исправить payload для Wavespeed edit/image-to-image: отправка обязательного поля `images`.
- [x] Проверить линтер и локальную верификацию после фикса (`ReadLints` + `bunx tsc --noEmit` с учетом существующих ошибок вне области фикса).
- [x] Диагностировать false-failed кейс в `ai-model` для `Nano Banana 2 (kieai-unified)`, когда провайдер возвращает policy-error при наличии результатов.
- [x] Исправить маппинг статуса в `kieai` provider: при `failed` + `resultUrls` считать задачу успешной и не прокидывать ошибку на фронт.
- [x] Заменить `SEEDREAM_4_5_EDIT_KIEAI` на `SEEDREAM_V4_5_EDIT_SEQUENTIAL_WAVESPEED` в `/ai-model` allowlist (backend + frontend sync).
- [x] Добавить модель `bytedance/seedream-v4.5/edit-sequential` в Wavespeed provider + registry и проверить `ReadLints`/`bunx tsc --noEmit` (с учетом существующих ошибок вне области задачи).
