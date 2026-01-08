# Media Providers

Система генерации медиа поддерживает несколько провайдеров API через абстрактную архитектуру.

## Доступные провайдеры

### OpenRouter
Провайдер для работы с моделями через OpenRouter API.

**Модели:**
- `NANO_BANANA` - Google Gemini 3 Pro Image Preview (генерация изображений)
- `KLING` - Kling AI (генерация видео и изображений)
- `MIDJOURNEY` - Midjourney (генерация изображений)

**Переменные окружения:**
```env
OPENROUTER_API_KEY=your_openrouter_api_key
APP_URL=http://localhost:3000
```

### GPTunnel
Провайдер для работы с моделями через GPTunnel API (async).

**Модели:**
- `VEO_3_1_FAST` - Google Veo 3.1 Fast (генерация видео)

**Переменные окружения:**
```env
GPTUNNEL_API_KEY=your_gptunnel_api_key
```

## Архитектура

```
server/features/media/
├── providers/
│   ├── interfaces.ts        # Абстрактные интерфейсы провайдеров
│   ├── openrouter.provider.ts # OpenRouter провайдер (sync)
│   ├── gptunnel.provider.ts   # GPTunnel провайдер (async с polling)
│   ├── provider-manager.ts    # Фабрика и маппинг моделей на провайдеры
│   └── index.ts               # Экспорты
└── openrouter.service.ts     # Сервис генерации (использует провайдеры)
```

## Добавление нового провайдера

1. Создайте файл `{provider-name}.provider.ts` в папке `providers/`
2. Реализуйте интерфейс `MediaProvider`:

```typescript
import type { MediaProvider, GenerateParams, TaskCreatedResult } from './interfaces';
import type { SavedFileInfo } from '../file.service';

export function createMyProvider(config: MyConfig): MediaProvider {
    return {
        name: 'my-provider',
        isAsync: false, // true если требуется polling

        async generate(params: GenerateParams): Promise<SavedFileInfo[] | TaskCreatedResult> {
            // Логика генерации
        },

        // Для async провайдеров:
        async checkTaskStatus?(taskId: string): Promise<TaskStatusResult> {
            // Проверка статуса задачи
        },

        async getTaskResult?(taskId: string): Promise<SavedFileInfo[]> {
            // Получение результата
        },
    };
}
```

3. Добавьте конфигурацию модели в `provider-manager.ts`:

```typescript
const MY_MODELS: Record<string, MediaModelConfig> = {
    MY_MODEL: {
        id: 'model-id',
        name: 'Model Name',
        types: ['VIDEO'] as const,
        maxPromptLength: 4096,
        supportsImageInput: true,
        provider: 'my-provider',
    },
};
```

4. Обновите `MODEL_PROVIDER_MAP` для маппинга модели на провайдер
5. Добавьте enum значение в `prisma/schema.prisma`
6. Выполните миграцию: `bunx prisma db push` или `bunx prisma migrate dev`

## Sync vs Async провайдеры

### Sync провайдеры (OpenRouter)
- `generate()` возвращает готовые файлы сразу
- `isAsync = false`
- Не требуют методов `checkTaskStatus` и `getTaskResult`

### Async провайдеры (GPTunnel)
- `generate()` создаёт задачу и возвращает `TaskCreatedResult`
- `isAsync = true`
- Требуют реализации `checkTaskStatus` и `getTaskResult`
- Сервис автоматически выполняет polling каждые 5 секунд (макс. 10 минут)

## Параметры генерации

```typescript
interface GenerateParams {
    requestId: number;
    prompt: string;
    model: MediaModel;
    inputFiles?: string[];           // URL или base64 для image-to-video
    aspectRatio?: '1:1' | '9:16' | '16:9';
    quality?: '1k' | '2k' | '4k';
}
```
