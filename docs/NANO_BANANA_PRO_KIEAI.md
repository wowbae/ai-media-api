# Nano Banana Pro (Kie.ai) - Документация

## Обзор

**Nano Banana Pro** от Google доступен через API провайдера Kie.ai. Модель поддерживает высококачественную генерацию изображений как из текста (text-to-image), так и на основе входных изображений (image-to-image).

## Основные возможности

- ✅ **Text-to-Image** - генерация изображений из текстового описания
- ✅ **Image-to-Image** - генерация на основе загруженных изображений
- ✅ **Выбор соотношения сторон** - 1:1, 9:16, 16:9, 3:4, 4:3, 2:3, 3:2
- ✅ **Настройка качества/разрешения** - 1K, 2K, 4K
- ✅ **Выбор формата** - PNG или JPG
- ✅ **Асинхронная обработка** - задачи обрабатываются в фоне

## Параметры генерации

### Соотношения сторон (aspect_ratio)
- `1:1` - квадратное изображение (по умолчанию)
- `9:16` - вертикальное (портрет)
- `16:9` - горизонтальное (альбом)
- `3:4` - портрет
- `4:3` - альбом
- `2:3` - портрет
- `3:2` - альбом

### Качество/Разрешение (quality)
Поддерживаются два формата значений:

**Числовые значения:**
- `1k` → 1K разрешение
- `2k` → 2K разрешение
- `4k` → 4K разрешение (рекомендуется)

**Текстовые значения:**
- `LOW` → 1K разрешение
- `MEDIUM` → 2K разрешение
- `HIGH` → 4K разрешение (по умолчанию)
- `ULTRA` → 4K разрешение

### Формат вывода (outputFormat)
- `png` - PNG формат (по умолчанию, без потерь)
- `jpg` или `jpeg` - JPEG формат (сжатый)

## Конфигурация

### Модель в конфиге
```typescript
NANO_BANANA_PRO_KIEAI: {
  id: "nano-banana-pro",
  name: "Nano Banana Pro (Kie.ai)",
  types: ["IMAGE"],
  maxPromptLength: 8192,
  supportsImageInput: true,
  provider: "kieai",
  pricing: {
    output: 0.09, // $0.09 за изображение
  },
}
```

### Переменные окружения
```env
KIEAI_API_KEY=your_api_key_here
IMGBB_API_KEY=your_imgbb_key_here  # Требуется для загрузки base64 изображений
```

**Примечание:** Для использования base64 изображений в `inputFiles` необходим API ключ от [imgbb.com](https://imgbb.com/). Base64 изображения автоматически загружаются на imgbb и конвертируются в публичные URLs перед отправкой в Kie.ai API.

## Примеры использования

### 1. Text-to-Image (базовая генерация)
```typescript
const params: GenerateParams = {
  requestId: 1,
  prompt: "A majestic mountain landscape at sunset, 4K quality",
  model: "NANO_BANANA_PRO_KIEAI",
  aspectRatio: "16:9",
  quality: "HIGH", // или "4k"
  outputFormat: "png"
};

const provider = getProviderManager().getProvider("NANO_BANANA_PRO_KIEAI");
const result = await provider.generate(params);
```

### 2. Image-to-Image (генерация на основе изображения)
```typescript
const params: GenerateParams = {
  requestId: 2,
  prompt: "Transform this into a watercolor painting style",
  model: "NANO_BANANA_PRO_KIEAI",
  inputFiles: [
    "https://example.com/input-image.jpg", // Публичный URL
    // или
    "data:image/png;base64,iVBORw0KGgoAAAANS..." // Base64 изображение
  ],
  aspectRatio: "1:1",
  quality: "ULTRA",
  outputFormat: "jpg"
};

const provider = getProviderManager().getProvider("NANO_BANANA_PRO_KIEAI");
const result = await provider.generate(params);
```

### 3. Image-to-Image с base64 изображением
```typescript
const params: GenerateParams = {
  requestId: 3,
  prompt: "Make it more vibrant and colorful",
  model: "NANO_BANANA_PRO_KIEAI",
  inputFiles: [
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA..." // Base64 изображение
  ],
  aspectRatio: "16:9",
  quality: "HIGH"
};

// Base64 автоматически загружается на imgbb и конвертируется в публичный URL
const provider = getProviderManager().getProvider("NANO_BANANA_PRO_KIEAI");
const result = await provider.generate(params);
```

### 4. Проверка статуса задачи
```typescript
// Получаем taskId из результата generate()
const taskId = result.taskId;

// Проверяем статус
const status = await provider.checkTaskStatus(taskId);
console.log(status); // { status: 'done', url: '...' }

// Получаем финальный результат
if (status.status === 'done') {
  const files = await provider.getTaskResult(taskId);
  console.log(files); // SavedFileInfo[]
}
```

## Форматы входных изображений

Провайдер поддерживает три формата входных изображений:

1. **Публичные URLs**
   ```typescript
   inputFiles: ["https://example.com/image.jpg"]
   ```
   Изображения по публичным URL используются напрямую.

2. **Base64 изображения**
   ```typescript
   inputFiles: ["data:image/png;base64,iVBORw0KGgo..."]
   ```
   Base64 изображения автоматически загружаются на imgbb и конвертируются в публичные URLs.
   **Требуется:** `IMGBB_API_KEY` в `.env`

3. **Локальные пути**
   ❌ Не поддерживаются. Используйте публичные URLs или base64.




## API эндпоинты

### Создание задачи
```
POST https://api.kie.ai/api/v1/jobs/createTask
```

**Тело запроса:**
```json
{
  "model": "nano-banana-pro",
  "input": {
    "prompt": "Your prompt here",
    "image_input": [],
    "aspect_ratio": "1:1",
    "resolution": "4K",
    "output_format": "png"
  }
}
```

### Проверка статуса
```
GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId={taskId}
```

## Структура ответов

### Создание задачи
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "task_nano-banana-pro_1765178625768"
  }
}
```

### Статус задачи
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "task_nano-banana-pro_1765178625768",
    "model": "nano-banana-pro",
    "state": "success",
    "resultJson": "{\"resultUrls\":[\"https://...\"]}"
  }
}
```

## Статусы задачи

| Статус API | Внутренний статус | Описание |
|------------|-------------------|----------|
| `waiting` | `pending` | Задача в очереди |
| `queuing` | `pending` | Задача ожидает обработки |
| `generating` | `processing` | Генерация в процессе |
| `success` | `done` | Успешно завершено |
| `fail` | `failed` | Ошибка генерации |

## Ценообразование

- **Стоимость:** $0.09 за изображение (~7₽)
- **Оплата:** списывается с баланса Kie.ai
- **Качество:** стоимость одинакова для всех разрешений

## Технические особенности

### Провайдер
- **Файл:** `server/features/media/providers/kieai/nano-banana.ts`
- **Тип:** Асинхронный провайдер
- **Метод:** Создание задачи → Polling статуса → Скачивание результата

### Интерфейсы
```typescript
interface KieAiNanoBananaRequest {
  model: "nano-banana-pro";
  callBackUrl?: string;
  input: {
    prompt: string;
    image_input?: string[];
    aspect_ratio?: KieAiNanoBananaAspectRatio;
    resolution?: KieAiNanoBananaResolution;
    output_format?: KieAiNanoBananaOutputFormat;
  };
}
```

### Маппинг параметров
```typescript
// Соотношения сторон
"1:1" | "9:16" | "16:9" → API format

// Качество
"LOW" → "1K"
"MEDIUM" → "2K"
"HIGH" | "ULTRA" → "4K"
"1k" → "1K"
"2k" → "2K"
"4k" → "4K"

// Формат
"jpg" | "jpeg" → "jpg"
"png" → "png"
```

## Обработка ошибок

### Коды ошибок HTTP
- `401` - Ошибка авторизации (неверный API ключ)
- `402`/`403` - Недостаточно средств на балансе
- `429` - Превышен лимит запросов
- `500` - Внутренняя ошибка сервера

### Коды ответов API
- `200` - Успешный запрос
- Другие коды - ошибка (см. поле `msg`)

## Логирование

Провайдер включает подробное логирование:
```typescript
console.log('[Kie.ai Nano Banana Pro] Создание задачи:', {...});
console.log('[Kie.ai Nano Banana Pro] Задача создана:', {taskId, ...});
console.log('[Kie.ai Nano Banana Pro] Проверка статуса задачи:', taskId);
console.log('[Kie.ai Nano Banana Pro] Парсинг статуса:', {...});
console.log('[Kie.ai Nano Banana Pro] Скачивание файла X/Y: url');
console.warn('[Kie.ai Nano Banana Pro] Задача завершилась с ошибкой:', {...});
```

## Сравнение с другими провайдерами

| Параметр | Nano Banana (Kie.ai) | Nano Banana (LaoZhang) | Midjourney (Kie.ai) |
|----------|---------------------|----------------------|-------------------|
| Цена | $0.09 | $0.05 | $18.00 |
| Image-to-Image | ✅ | ✅ | ✅ |
| Разрешения | 1K, 2K, 4K | 1K, 2K, 4K | Зависит от версии |
| Форматы | PNG, JPG | PNG, JPG | PNG |
| Async | ✅ | ✅ | ✅ |

## Рекомендации

1. **Используйте качество HIGH (4K)** для лучших результатов
2. **Формат PNG** для изображений с прозрачностью или когда важно качество
3. **Формат JPG** для фотографий или когда нужен меньший размер файла
4. **Image-to-Image** эффективен для стилизации существующих изображений
5. **Подробные промпты** дают лучшие результаты (до 8192 символов)
6. **Base64 изображения** автоматически загружаются на imgbb - требуется `IMGBB_API_KEY`
7. **Публичные URLs** предпочтительнее base64 для лучшей производительности

## Ссылки

- [Официальная документация Kie.ai](https://docs.kie.ai/market/google/pro-image-to-image)
- [Kie.ai Console](https://kie.ai/settings)
- [Kie.ai Market](https://kie.ai/market)

## Changelog

### v1.0.0 (2025-01-XX)
- ✅ Добавлена модель NANO_BANANA_PRO_KIEAI
- ✅ Поддержка text-to-image и image-to-image
- ✅ Настройка разрешения (1K, 2K, 4K)
- ✅ Выбор формата вывода (PNG, JPG)
- ✅ Поддержка различных соотношений сторон
- ✅ Интеграция с provider-manager
- ✅ Автоматическая загрузка base64 изображений через imgbb

---

**Последнее обновление:** 2025-01-XX