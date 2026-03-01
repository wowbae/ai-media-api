# Гайд по добавлению новой медиа-модели в проект

Этот документ описывает пошаговый алгоритм добавления новой нейросети/модели для генерации медиа (изображения, видео, аудио) в проект ai-media-api.

## 📋 Чек-лист добавления модели

### Шаг 1: Исследование документации API

1. **Изучите документацию провайдера** (например, kie.ai, gptunnel.ru, и т.д.)
2. **Найдите точные названия моделей** для API запросов:
   - Откройте playground провайдера
   - Используйте DevTools (Network tab) для перехвата запросов
   - Найдите поле `model` в JSON запросах
   - Запишите точное значение (например, `"seedream/5.0-text-to-image"`)
3. **Определите параметры модели**:
   - Тип: IMAGE / VIDEO / AUDIO
   - Поддерживаемые форматы (aspect ratios)
   - Настройки качества
   - Длительность (для видео)
   - Поддержка image-to-* (загрузка изображений)
   - Специфичные параметры (sound, mode, multi_shots, и т.д.)
4. **Запишите эндпоинты API**:
   - Создание задачи: `POST /api/v1/jobs/createTask`
   - Проверка статуса: `GET /api/v1/jobs/recordInfo?taskId={id}`
5. **Формат ответа API**:
   - Структура ответа при создании задачи
   - Структура ответа при проверке статуса
   - Маппинг статусов (waiting/queuing/generating/success/fail)

---

### Шаг 2: Бэкенд - Интерфейсы

**Файл**: `server/features/media/providers/kieai/interfaces.ts`

Добавьте типы и интерфейсы для новой модели:

```typescript
// Интерфейсы для NewModel API
// Документация: https://kie.ai/new-model

// Режимы генерации
export type KieAiNewModelMode = "std" | "pro";

// Соотношения сторон
export type KieAiNewModelAspectRatio = "1:1" | "16:9" | "9:16";

// Качество
export type KieAiNewModelQuality = "basic" | "high";

// Длительность (для видео)
export type KieAiNewModelDuration = 3 | 5 | 10 | 15;

// Запрос Text-to-Image/Video
export interface KieAiNewModelTextToXRequest {
  model: "new-model/text-to-x";  // ← ТОЧНОЕ название из API
  callBackUrl?: string;
  input: {
    prompt: string;
    aspect_ratio?: KieAiNewModelAspectRatio;
    quality?: KieAiNewModelQuality;
    duration?: KieAiNewModelDuration;
    // другие параметры
  };
}

// Запрос Image-to-Image/Video
export interface KieAiNewModelImageToXRequest {
  model: "new-model/image-to-x";  // ← ТОЧНОЕ название из API
  callBackUrl?: string;
  input: {
    prompt: string;
    image_urls: string[];
    // другие параметры
  };
}
```

---

### Шаг 3: Бэкенд - Провайдер

**Файл**: `server/features/media/providers/kieai/new-model.ts` (создать новый)

Скопируйте существующий провайдер (например, `seedream.ts`) и адаптируйте:

```typescript
// NewModel провайдер через Kie.ai API
// Документация: https://kie.ai/new-model
import type {
  MediaProvider,
  GenerateParams,
  TaskCreatedResult,
  TaskStatusResult,
} from "../interfaces";
import type { SavedFileInfo } from "../../file.service";
import { saveFileFromUrl } from "../../file.service";
import { uploadToImgbb, isImgbbConfigured } from "../../imgbb.service";
import type {
  KieAiConfig,
  KieAiNewModelTextToXRequest,
  KieAiNewModelImageToXRequest,
  KieAiUnifiedCreateResponse,
  KieAiUnifiedTaskResponse,
} from "./interfaces";

const KIEAI_STATUS_MAP: Record<string, TaskStatusResult["status"]> = {
  waiting: "pending",
  queuing: "pending",
  generating: "processing",
  success: "done",
  fail: "failed",
};

// Функции маппинга параметров
function mapAspectRatio(...): ... { }
function mapQuality(...): ... { }

export function createKieAiNewModelProvider(config: KieAiConfig): MediaProvider {
  const { apiKey, baseURL } = config;

  async function createTask(params: GenerateParams): Promise<{ taskId: string }> {
    // 1. Определить режим (text-to-x или image-to-x)
    const isImageToX = params.inputFiles && params.inputFiles.length > 0;
    
    // 2. Подготовить параметры
    // 3. Загрузить изображения на imgbb если нужно
    // 4. Сформировать requestBody с ТОЧНЫМ названием модели
    const requestBody = {
      model: "new-model/text-to-x",  // ← ВСТАВИТЬ ТОЧНОЕ НАЗВАНИЕ
      input: { ... }
    };
    
    // 5. Отправить запрос
    const response = await fetch(`${baseURL}/api/v1/jobs/createTask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
    
    // 6. Обработать ответ
    const responseData = await response.json();
    if (responseData.code !== 200) {
      throw new Error(`Kie.ai API error: ${responseData.code} - ${responseData.msg}`);
    }
    
    return { taskId: responseData.data.taskId };
  }

  async function getTaskResultFromAPI(taskId: string): Promise<{
    status: string;
    resultUrls?: string[];
    error?: string;
  }> {
    // 1. Запросить статус задачи
    const response = await fetch(
      `${baseURL}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
      { method: "GET", headers: { Authorization: `Bearer ${apiKey}` } }
    );
    
    // 2. Распарсить resultJson для получения URL
    const taskData = response.data;
    const resultUrls = JSON.parse(taskData.resultJson).resultUrls || [];
    
    return {
      status: taskData.state,
      resultUrls,
      error: taskData.failMsg
    };
  }

  return {
    name: "kieai-new-model",
    isAsync: true,

    async generate(params: GenerateParams): Promise<TaskCreatedResult> {
      const result = await createTask(params);
      return { taskId: result.taskId, status: "pending" };
    },

    async checkTaskStatus(taskId: string): Promise<TaskStatusResult> {
      const result = await getTaskResultFromAPI(taskId);
      const mappedStatus = KIEAI_STATUS_MAP[result.status] || "pending";
      
      return {
        status: mappedStatus,
        url: result.resultUrls?.[0],
        error: result.error
      };
    },

    async getTaskResult(taskId: string): Promise<SavedFileInfo[]> {
      const result = await getTaskResultFromAPI(taskId);
      
      if (result.status !== "success" || !result.resultUrls?.length) {
        throw new Error(`Task not completed: status=${result.status}`);
      }
      
      const files: SavedFileInfo[] = [];
      for (const url of result.resultUrls) {
        const savedFile = await saveFileFromUrl(url);
        files.push(savedFile);
      }
      
      return files;
    },
  };
}
```

**Важно**: Убедитесь, что названия моделей в `model:` полях соответствуют тем, что возвращает API!

---

### Шаг 4: Бэкенд - Экспорт провайдера

**Файл**: `server/features/media/providers/kieai/index.ts`

Добавьте экспорт:

```typescript
export { createKieAiNewModelProvider } from "./new-model";
```

---

### Шаг 5: Бэкенд - Конфигурация моделей

**Файл**: `server/features/media/config.ts`

Добавьте модель в `MEDIA_MODELS`:

```typescript
NEW_MODEL_KIEAI: {
    id: 'new-model/text-to-x',  // ← ID модели
    name: 'New Model',  // ← Отображаемое имя
    types: ['IMAGE'] as const,  // или ['VIDEO'], ['AUDIO']
    maxPromptLength: 8192,
    promptLimit: 3000,  // если есть ограничение
    supportsImageInput: true,  // поддерживает ли загрузку изображений
    provider: 'kieai',
    pricing: {
        output: 0.1,  // цена за генерацию
    },
},
```

---

### Шаг 6: Бэкенд - Provider Manager

**Файл**: `server/features/media/providers/provider-manager.ts`

1. **Импортируйте фабрику провайдера**:

```typescript
import {
    // ... другие импорты
    createKieAiNewModelProvider,
} from './kieai';
```

2. **Добавьте в `KIEAI_MODEL_FACTORIES`**:

```typescript
const KIEAI_MODEL_FACTORIES: Record<string, (config: KieAiConfig) => MediaProvider> = {
    // ... другие модели
    NEW_MODEL_KIEAI: createKieAiNewModelProvider,
};
```

---

### Шаг 7: Бэкенд - Интерфейсы (MediaModel)

**Файл**: `server/features/media/interfaces.ts`

Добавьте модель в тип `MediaModel`:

```typescript
export type MediaModel =
    | 'MIDJOURNEY'
    | 'KLING_2_6_KIEAI'
    | 'NEW_MODEL_KIEAI'  // ← ДОБАВИТЬ
    | 'SEEDREAM_4_5_KIEAI'
    // ... другие
```

Добавьте параметры в `GenerateMediaRequest` (если нужны новые):

```typescript
export interface GenerateMediaRequest {
  // ... существующие параметры
  newModelParam?: string;  // ← Специфичные параметры модели
}
```

---

### Шаг 8: Фронтенд - Типы

**Файл**: `src/redux/api/base.ts`

Добавьте модель в `MediaModel`:

```typescript
export type MediaModel =
    | 'MIDJOURNEY'
    | 'NEW_MODEL_KIEAI'  // ← ДОБАВИТЬ
    | 'SEEDREAM_4_5_KIEAI'
    // ... другие
```

---

### Шаг 9: Фронтенд - Конфигурация модели

**Файл**: `src/lib/model-config.ts`

1. **Добавьте флаги в `ModelConfig`**:

```typescript
export interface ModelConfig {
    // ... существующие флаги
    isNewModel: boolean;  // ← Новый флаг
    // ...
}
```

2. **Добавьте конфигурацию модели**:

```typescript
NEW_MODEL_KIEAI: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isKling3: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isSeedream5: false,
    isSeedream5_Edit: false,
    isNewModel: true,  // ← Установить true
    isElevenLabs: false,
    supportsFormat: true,
    supportsQuality: true,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: false,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false,
    supportsMode: false,
    supportsMultiShots: false,
    maxInputFiles: 14,  // если есть ограничение
},
```

**Важно**: Добавьте `isNewModel: false` во все остальные модели!

---

### Шаг 10: Фронтенд - Настройки модели

**Файл**: `src/components/media/chat-input/model-settings-config.ts`

Добавьте настройки для модели:

```typescript
const MODEL_SETTINGS_CONFIG: Record<MediaModel, ModelSettingConfig> = {
    // ... другие модели
    NEW_MODEL_KIEAI: {
        format: {
            options: FORMAT_OPTIONS_SEEDREAM,  // или свои
            defaultValue: '9:16',
        },
        quality: {
            options: QUALITY_OPTIONS_SEEDREAM,  // или свои
            defaultValue: '4k',
        },
        // другие настройки
    },
};
```

---

### Шаг 11: Фронтенд - Утилиты

**Файл**: `src/lib/model-utils.ts`

Добавьте эмодзи для модели:

```typescript
const MODEL_ICONS: Record<string, string> = {
    // ... другие
    NEW_MODEL_KIEAI: '🆕',  // ← Свой эмодзи
};
```

---

### Шаг 12: Фронтенд - Валидация

**Файл**: `src/components/media/chat-input/use-chat-input-submit.ts`

Добавьте валидацию если нужно:

```typescript
// Валидация для New Model Edit: максимум N файлов
if (params.modelType.isNewModel && params.attachedFiles.length > (params.modelType.maxInputFiles || 0)) {
    submitInProgressRef.current = false;
    setIsSubmitting(false);
    if (onSendError) {
        onSendError(`New Model поддерживает максимум ${params.modelType.maxInputFiles} файлов`);
    }
    return;
}
```

---

### Шаг 13: Фронтенд - Подсказки в UI

**Файл**: `src/components/media/chat-input.tsx`

Добавьте подсказку:

```tsx
{/* Подсказка для New Model Edit */}
{modelType.isNewModel && modelType.maxInputFiles && (
    <p className='mb-2 text-xs text-muted-foreground'>
        New Model поддерживает до {modelType.maxInputFiles} изображений
    </p>
)}
```

---

### Шаг 14: Проверка и тестирование

1. **TypeScript компиляция**:
   ```bash
   npx tsc --noEmit
   ```
   Убедитесь, что нет ошибок!

2. **Сборка проекта**:
   ```bash
   npm run build
   ```

3. **Тестирование генерации**:
   - Запустите проект: `npm run dev`
   - Выберите новую модель в UI
   - Отправьте запрос на генерацию
   - Проверьте логи на ошибки

4. **Проверка логов**:
   - Смотрите логи создания задачи
   - Проверьте маппинг статусов
   - Убедитесь, что файлы скачиваются

---

## 🔍 Частые ошибки и решения

### Ошибка: "model name is not supported"

**Проблема**: Неверное название модели в поле `model:` запроса.

**Решение**:
1. Откройте playground провайдера
2. Откройте DevTools → Network
3. Отправьте тестовый запрос
4. Найдите поле `model` в запросе
5. Используйте ТОЧНО ЭТО значение

**Примеры правильных названий для Kie.ai**:
- Kling 3.0: `"kling-3.0/video"` (единый для text и image)
- Seedream 5.0: `"seedream/5-lite-text-to-image"`, `"seedream/5-lite-image-to-image"`
- Seedream 4.5: `"seedream/4.5-text-to-image"`, `"seedream/4.5-edit"`
- Kling 2.6: `"kling-2.6/text-to-video"`, `"kling-2.6/image-to-video"`

**Важно**: 
- duration для Kling 3.0 передается как строка `"5"`, а не число `5`
- Kling 3.0 использует единый model для всех типов: `"kling-3.0/video"`

### Ошибка: TypeScript ошибки в model-config.ts

**Проблема**: Отсутствуют флаги `isNewModel` в других моделях.

**Решение**: Добавьте `isNewModel: false` во ВСЕ модели, кроме новой.

### Ошибка: removeChild на фронте

**Проблема**: Модель не добавлена в `src/redux/api/base.ts` или `src/lib/model-config.ts`.

**Решение**: Проверьте, что модель добавлена во все файлы фронтенда.

### Ошибка: 422 Unprocessable Entity

**Проблема**: Неверная структура запроса или параметры.

**Решение**:
1. Проверьте названия полей (aspect_ratio vs aspectRatio)
2. Проверьте типы данных (строки vs числа)
3. Сравните с рабочими моделями

---

## 📝 Шаблон для быстрого старта

Создайте файл `server/features/media/providers/kieai/TEMPLATE.ts` с шаблоном провайдера и используйте его как основу для новых моделей.

---

## ✅ Итоговый чек-лист

- [ ] Изучена документация API
- [ ] Найдены точные названия моделей
- [ ] Добавлены интерфейсы
- [ ] Создан провайдер
- [ ] Добавлен экспорт провайдера
- [ ] Добавлена модель в `MEDIA_MODELS`
- [ ] Обновлен `provider-manager.ts`
- [ ] Обновлен тип `MediaModel` (бэкенд)
- [ ] Обновлен тип `MediaModel` (фронтенд)
- [ ] Добавлена конфигурация в `model-config.ts`
- [ ] Добавлены настройки в `model-settings-config.ts`
- [ ] Добавлен эмодзи в `model-utils.ts`
- [ ] Добавлена валидация (если нужна)
- [ ] Добавлены подсказки в UI
- [ ] TypeScript компилируется без ошибок
- [ ] Сборка проходит успешно
- [ ] Генерация работает корректно

---

## 📚 Примеры реализации

- Изображения: `seedream.ts`, `nano-banana.ts`
- Видео: `kling.ts`, `veo.ts`
- Аудио: `elevenlabs.ts`
- Image-to-X: `seedream.ts` (режим Edit)

Используйте их как референсы при создании новых моделей.
