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
- [x] Диагностировать `failed` для `bytedance/seedream-v4.5/edit-sequential`: воспроизвести API-запрос и проверить статус по `urls.get`.
- [x] Исправить `size` для `SEEDREAM_V4_5_EDIT_SEQUENTIAL_WAVESPEED`: использовать отдельные high-resolution размеры (>= 3,686,400 px), чтобы убрать мгновенный fail по валидации Wavespeed.
- [x] Диагностировать падение Wavespeed LoRA с `Failed to get remote file properties` и добавить раннюю preflight-проверку доступности LoRA URL (HEAD/GET) до отправки задачи провайдеру.
- [x] Исправить нормализацию LoRA URL при смене ngrok домена: переписывать absolute URL с `/media-files/*` на текущий `MEDIA_PUBLIC_BASE_URL`.
- [x] Перевести выдачу URL LoRA из storage-service на относительный путь `/media-files/loras/*`, чтобы исключить зависимость от конкретного туннеля.
- [x] Добавить `safety_checker: false` в payload Wavespeed image-запросов (`turbo-lora`, `image-to-image`, `edit-sequential`) для проверки гипотезы о влиянии safety checker на результат.
- [x] Добавить в UI/submit поток `triggerWord` для `Z_IMAGE_LORA_TRAINER_WAVESPEED` и backend-проверку обязательности (>=2 символов).
- [x] Поднять лимит ZIP для LoRA Trainer до 50MB на фронте (file attach) и продублировать серверный guard размера в Wavespeed trainer parser.
- [x] Сверить документацию Wavespeed Z-Image LoRA Trainer (PDF) и убрать некорректное требование `prompt` для trainer-модели в `/generate`.
- [x] Исправить polling TaskTracking: при `task not found` завершать задачу как `FAILED` без повторных проверок статуса.
- [x] Исправить маршрутизацию Wavespeed video-моделей: выбирать endpoint по `model` (чтобы `WAN_2_2_*` не отправлялся в `kling-video-o1`).
- [x] Добавить модель `WAN_2_2_IMAGE_TO_VIDEO_WAVESPEED` (`wavespeed-ai/wan-2.2/i2v-720p`) в backend/frontend конфиги и allowlist `ai-model`.
- [x] Смягчить UX для отмененных запросов (`AbortError`/`aborted`) в `use-chat-input-submit`: не показывать generic alert, отдавать понятное сообщение и разрешать повторную отправку.
- [x] Исправить `duration` для WAN 2.2 (Wavespeed): отправлять только допустимые значения `[5, 8]` на backend и ограничить UI-опции теми же значениями.

## 2026-04-05

- [x] LoRA на фронте: каталог URL в `shared/constants/loras.ts`, каскадные селекты (до 3), без локального сервера и загрузки с диска; проброс `loras` в payload Z-Image Turbo Image-to-Image LoRA (Wavespeed).
- [x] Структура репозитория: `frontend/` (UI), `backend/` (Express), `shared/` (общие константы в корне).

## 2026-03-26

- [x] Исправить request payload Wavespeed WAN 2.2: убрать лишние поля (`images`, `safety_checker`) и для LoRA эндпоинта добавить `loras`.
- [x] Внедрить payload-mapping + preflight validation для провайдера `kieai` (unified-provider): schema/white-list ключей + required поля перед отправкой запроса.
- [x] Внедрить payload-mapping + preflight validation для провайдера `laozhang`: Nano Banana Pro (Google Native) + базовый OpenAI-compatible чатовый payload.
- [x] `gptunnel`: удалить неиспользуемый media-провайдер (в `MEDIA_MODELS` нет моделей с `provider: "gptunnel"`).
