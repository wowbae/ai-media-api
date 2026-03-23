# Анализ архитектуры генерации медиа-контента

## Обзор текущей архитектуры

### Структура компонентов

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer (Routes)                       │
│                    /generate endpoint                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Generation Service                            │
│              (generateMedia function)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Provider Manager                               │
│            (getProvider, getModelConfig)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Concrete Providers                            │
│  ┌──────────┐  ┌─────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ Kie.ai   │  │GPTunnel │ │LaoZhang  │  │ Wavespeed      │  │
│  │ (14 шт)  │  │         │  │          │  │                │  │
│  └──────────┘  └─────────┘  └──────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Task Tracking Service                           │
│           (polling каждые 5 секунд)                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               Completion Handler                                │
│         (save files, notify, cleanup)                           │
└─────────────────────────────────────────────────────────────────┘
```

## Выявленные проблемы

### 1. **Избыточная абстракция провайдеров Kie.ai**

**Проблема:**
- Создано **14 отдельных провайдеров** для Kie.ai (по одному на модель)
- Каждый провайдер дублирует ~80% кода (checkTaskStatus, getTaskResult, статус-маппинг)
- Отличаются только запросами на создание задачи (create*Task)
- Каждый провайдер имеет свои интерфейсы (KieAiKlingRequest, KieAiVeoRequest, etc.)

**Пример дублирования:**
```typescript
// kling.ts - 250 строк
async checkTaskStatus(taskId: string): Promise<TaskStatusResult> {
  const result = await getTaskResultFromAPI(taskId);
  const mappedStatus = KIEAI_STATUS_MAP[result.status] || "pending";
  return { status: mappedStatus, url: resultUrl, error: errorMessage };
}

// veo.ts - 230 строк (почти идентично)
async checkTaskStatus(taskId: string): Promise<TaskStatusResult> {
  const result = await getTaskResultFromAPI(taskId);
  const mappedStatus = KIEAI_STATUS_MAP[result.status] || "pending";
  return { status: mappedStatus, url: resultUrl, error: errorMessage };
}

// midjourney.ts - 200 строк (снова то же самое)
async checkTaskStatus(taskId: string): Promise<TaskStatusResult> {
  const result = await getTaskResultFromAPI(taskId);
  const mappedStatus = KIEAI_STATUS_MAP[result.status] || "pending";
  return { status: mappedStatus, url: resultUrl, error: errorMessage };
}
```

**Статистика:**
- ~2500 строк дублирующегося кода в провайдерах Kie.ai
- 14 файлов провайдеров вместо 1-2
- 14 разных интерфейсов для однотипных запросов

### 2. **Сложная система интерфейсов**

**Проблема:**
- 3 уровня интерфейсов:
  1. `server/features/media/interfaces.ts` (MediaModel)
  2. `server/features/media/providers/interfaces.ts` (GenerateParams, MediaProvider)
  3. `server/features/media/providers/kieai/interfaces.ts` (KieAi*Request)
- Дублирование типов MediaModel в двух местах
- Избыточные интерфейсы для каждого метода API

**Пример:**
```typescript
// interfaces.ts - общий
export interface GenerateParams {
  requestId: number;
  prompt: string;
  model: MediaModel;
  inputFiles?: string[];
  aspectRatio?: ...;
  // ... 30+ полей
}

// kieai/interfaces.ts - специфичные
export interface KieAiKlingTextToVideoRequest {
  prompt: string;
  sound: boolean;
  aspect_ratio: KieAiKlingAspectRatio;
  duration: KieAiKlingDuration;
}

export interface KieAiKlingImageToVideoRequest {
  prompt: string;
  image_urls: string[];
  sound: boolean;
  duration: KieAiKlingDuration;
}

// ... ещё 10+ интерфейсов для каждой модели
```

### 3. **Неэффективный polling задач**

**Проблема:**
- TaskTrackingService опрашивает API каждые **5 секунд** для всех задач
- Максимальное время ожидания: **10 минут** (120 проверок на задачу)
- Нет экспоненциальной задержки (backoff)
- Нет webhook поддержки (хотя Kie.ai поддерживает callBackUrl)
- Пустые проверки тратят API квоты

**Код:**
```typescript
private readonly STATUS_CHECK_INTERVAL = 5000; // 5 секунд
private readonly MAX_CHECK_TIME = 10 * 60 * 1000; // 10 минут

private startStatusCheckForTask(key: string, task: TrackedTask): void {
  const intervalId = setInterval(async () => {
    await this.checkTaskStatus(key, task);
  }, this.STATUS_CHECK_INTERVAL);
}
```

**Расчёт:**
- Задача выполняется 3 минуты → 36 проверок API
- 100 задач в день → 3600 API вызовов только на polling
- Многие проверки возвращают "pending" без полезной информации

### 4. **Сложная обработка результатов**

**Проблема:**
- CompletionHandler дублирует логику получения результатов
- Несколько уровней обёрток для сохранения файлов
- Идемпотентность реализована сложно (COMPLETING статус)
- Фоновая загрузка на imgbb может завершиться после отправки уведомления

**Код:**
```typescript
// generation.service.ts
const savedMediaFiles = await saveFilesToDatabase(requestId, result);
await sendFilesToTelegram(requestId, savedMediaFiles, prompt);
await uploadFilesToImgbbAndUpdateDatabase(result, requestId, prompt);
await sendSSENotification(requestId, 'COMPLETED', {...});

// completion-handler.service.ts (дублирование)
const savedMediaFiles = await saveFilesToDatabase(requestId, savedFiles);
await sendFilesToTelegram(requestId, savedMediaFiles, prompt);
await sendSSENotification(requestId, 'COMPLETED', {...});
// imgbb в фоне отдельно
```

### 5. **Маппинг моделей в ProviderManager**

**Проблема:**
- Жёсткий маппинг моделей на фабрики в коде
- При добавлении модели нужно менять provider-manager.ts
- Нет автоматической регистрации провайдеров

```typescript
const KIEAI_MODEL_FACTORIES: Record<string, (config: KieAiConfig) => MediaProvider> = {
  KLING_2_6_KIEAI: createKieAiKlingProvider,
  KLING_3_0_KIEAI: createKieAiKling3Provider,
  NANO_BANANA_PRO_KIEAI: createKieAiNanoBananaProvider,
  // ... 11 ещё
};
```

## Сравнение с лучшими практиками

### Best Practice: Unified Provider Pattern

```typescript
// Вместо 14 провайдеров - 1 универсальный
class KieAiProvider implements MediaProvider {
  private readonly modelConfigs: Record<string, ModelConfig> = {
    KLING_2_6_KIEAI: {
      endpoint: '/api/v1/jobs/createTask',
      model: 'kling-2.6/text-to-video',
      mapParams: (params) => ({...}),
    },
    VEO_3_1_FAST_KIEAI: {
      endpoint: '/api/v1/veo/generate',
      model: 'veo3_fast',
      mapParams: (params) => ({...}),
    },
  };

  async generate(params: GenerateParams): Promise<TaskCreatedResult> {
    const config = this.modelConfigs[params.model];
    const body = config.mapParams(params);
    const response = await fetch(`${baseURL}${config.endpoint}`, {...});
    return { taskId: response.data.taskId, status: 'pending' };
  }

  // Единая реализация для всех моделей
  async checkTaskStatus(taskId: string): Promise<TaskStatusResult> {
    // ...
  }
}
```

### Best Practice: Webhook over Polling

```typescript
// Kie.ai поддерживает callBackUrl
const requestBody = {
  model: 'kling-2.6',
  callBackUrl: 'https://your-server.com/webhooks/kieai', // ←
  input: {...}
};

// Вместо polling - webhook handler
router.post('/webhooks/kieai', async (req, res) => {
  const { taskId, status, resultUrls } = req.body;
  await handleTaskCompleted(taskId, status, resultUrls);
});
```

### Best Practice: Exponential Backoff

```typescript
// Вместо фиксированных 5 секунд
const delays = [2000, 5000, 10000, 15000, 30000]; // ← экспоненциально
const delay = delays[Math.min(checkCount, delays.length - 1)];
```

## Выводы

### Текущее состояние:
✅ **Хорошо:**
- Разделение ответственности (services, providers, handlers)
- Поддержка multiple провайдеров
- Идемпотентность обработки результатов
- SSE уведомления клиентов

❌ **Проблемы:**
- **14 провайдеров Kie.ai** вместо 1-2 (избыточная абстракция)
- **~2500 строк дублирующегося кода**
- **Неэффективный polling** (5 сек интервал, 10 минут макс)
- **Сложная система интерфейсов** (3 уровня, дублирование)
- **Ручное управление маппингом моделей**

### Рекомендация:
**Требуется рефакторинг** с упрощением архитектуры при сохранении функциональности.

Основные направления:
1. Консолидация Kie.ai провайдеров в 1-2 универсальных
2. Упрощение системы интерфейсов
3. Оптимизация polling (exponential backoff + webhook опционально)
4. Упрощение обработки результатов
