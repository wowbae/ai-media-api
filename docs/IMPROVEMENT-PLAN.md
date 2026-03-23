# План улучшений и упрощений архитектуры

## Цель

Упростить архитектуру генерации медиа при сохранении всей функциональности:
- Сократить код на ~60% (с ~3500 до ~1400 строк)
- Уменьшить количество файлов провайдеров с 14 до 2
- Оптимизировать polling задач (меньше API вызовов)
- Упростить добавление новых моделей

---

## Фаза 1: Консолидация Kie.ai провайдеров

### 1.1 Создать универсальный Kie.ai провайдер

**Файл:** `server/features/media/providers/kieai/unified-provider.ts`

**Концепция:**
Вместо 14 отдельных провайдеров создать 1 универсальный с конфигурацией моделей:

```typescript
interface KieAiModelConfig {
  endpoint: string;
  statusEndpoint?: string;  // опционально, по умолчанию /recordInfo
  model: string;
  types: ('IMAGE' | 'VIDEO' | 'AUDIO')[];
  
  // Функция маппинга параметров
  mapParams: (params: GenerateParams) => Record<string, unknown>;
  
  // Опционально: кастомная обработка ответа
  mapResponse?: (data: any) => { taskId: string };
  
  // Опционально: кастомный статус-маппинг
  statusMap?: Record<string, 'pending' | 'processing' | 'done' | 'failed'>;
}

class UnifiedKieAiProvider implements MediaProvider {
  private readonly modelConfigs: Record<string, KieAiModelConfig> = {
    KLING_2_6_KIEAI: {
      endpoint: '/api/v1/jobs/createTask',
      model: 'kling-2.6/text-to-video',
      types: ['VIDEO'],
      mapParams: (params) => ({
        model: params.inputFiles?.length ? 'kling-2.6/image-to-video' : 'kling-2.6/text-to-video',
        input: {
          prompt: params.prompt,
          sound: params.sound ?? true,
          duration: params.duration === 10 ? '10' : '5',
          ...(params.inputFiles?.length && { image_urls: [params.inputFiles[0]] }),
          ...(params.aspectRatio && { aspect_ratio: mapAspectRatio(params.aspectRatio) }),
        }
      }),
    },
    
    VEO_3_1_FAST_KIEAI: {
      endpoint: '/api/v1/veo/generate',
      statusEndpoint: '/api/v1/veo/record-info',
      model: 'veo3_fast',
      types: ['VIDEO'],
      mapParams: (params) => ({
        prompt: params.prompt,
        model: 'veo3_fast',
        aspectRatio: params.ar || params.aspectRatio,
        generationType: params.generationType || 'TEXT_2_VIDEO',
        ...(params.inputFiles?.length && { imageUrls: params.inputFiles }),
      }),
    },
    
    // ... остальные модели
  };

  async generate(params: GenerateParams): Promise<TaskCreatedResult> {
    const config = this.modelConfigs[params.model];
    if (!config) throw new Error(`Unknown model: ${params.model}`);
    
    const body = config.mapParams(params);
    const response = await this.apiCall(config.endpoint, body);
    
    return {
      taskId: response.data.taskId,
      status: 'pending',
    };
  }

  async checkTaskStatus(taskId: string, model: string): Promise<TaskStatusResult> {
    const config = this.modelConfigs[model];
    const endpoint = config?.statusEndpoint || '/api/v1/jobs/recordInfo';
    
    const response = await this.apiCall(`${endpoint}?taskId=${taskId}`);
    const statusMap = config?.statusMap || DEFAULT_STATUS_MAP;
    
    return {
      status: statusMap[response.data.state] || 'pending',
      url: response.data.resultUrls?.[0],
      error: response.data.failMsg,
    };
  }

  async getTaskResult(taskId: string, model: string): Promise<SavedFileInfo[]> {
    const status = await this.checkTaskStatus(taskId, model);
    if (status.status !== 'done') {
      throw new Error(`Task not completed: ${status.status}`);
    }
    
    const urls = this.extractResultUrls(status);
    return Promise.all(urls.map(url => saveFileFromUrl(url)));
  }
}
```

**Выгода:**
- 1 файл вместо 14
- ~250 строк вместо ~2500
- Легко добавлять новые модели (просто добавить конфиг)

### 1.2 Упростить интерфейсы Kie.ai

**Файл:** `server/features/media/providers/kieai/interfaces.ts`

Вместо отдельных интерфейсов для каждой модели использовать унифицированные:

```typescript
// УНИВЕРСАЛЬНЫЙ ЗАПРОС
export interface KieAiJobRequest {
  model: string;
  callBackUrl?: string;
  input: Record<string, unknown>;
}

// УНИВЕРСАЛЬНЫЙ ОТВЕТ
export interface KieAiJobResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

// УНИВЕРСАЛЬНЫЙ СТАТУС
export interface KieAiJobStatus {
  taskId: string;
  state: 'waiting' | 'queuing' | 'generating' | 'success' | 'fail';
  param: string;
  resultJson: string;
  failCode: string;
  failMsg: string;
  completeTime: number;
  createTime: number;
}

// Helper функции для специфичных маппингов
export const klingMappers = {
  mapAspectRatio: (ar: string) => ...,
  mapDuration: (sec: number) => ...,
};

export const veoMappers = {
  mapGenerationType: (type: string) => ...,
  ...
};
```

**Выгода:**
- 50 строк вместо 400
- Меньше дублирования

---

## Фаза 2: Оптимизация polling задач

### 2.1 Экспоненциальная задержка (Exponential Backoff)

**Файл:** `server/features/media/task-tracking.service.ts`

Заменить фиксированный интервал на экспоненциальный:

```typescript
class TaskTrackingService {
  // Убираем фиксированный интервал
  // private readonly STATUS_CHECK_INTERVAL = 5000;
  
  // Экспоненциальные задержки (мс)
  private readonly CHECK_DELAYS = [
    2000,   // 1-я проверка: 2 сек
    5000,   // 2-я: 5 сек
    10000,  // 3-я: 10 сек
    15000,  // 4-я: 15 сек
    20000,  // 5-я: 20 сек
    30000,  // 6-я+: 30 сек
  ];
  
  private getDelay(checkCount: number): number {
    const index = Math.min(checkCount, this.CHECK_DELAYS.length - 1);
    return this.CHECK_DELAYS[index];
  }
  
  private async checkTaskStatus(key: string, task: TrackedTask): Promise<void> {
    const delay = this.getDelay(task.checkCount);
    
    // Планируем следующую проверку с задержкой
    const timeoutId = setTimeout(async () => {
      await this.performStatusCheck(key, task);
    }, delay);
    
    this.statusCheckTimeouts.set(key, timeoutId);
  }
}
```

**Выгода:**
- Меньше API вызовов для долгозадач (3 минуты: 36 → 12 проверок)
- Быстрая реакция на короткие задачи (первые 2 проверки часто)
- Экономия API квот: ~60% меньше вызовов

### 2.2 Опциональная поддержка webhook

**Файл:** `server/features/media/routes/webhooks.ts`

Добавить webhook handler для провайдеров, которые поддерживают callback:

```typescript
// Роутер для webhook'ов
export function createWebhookRouter(): Router {
  const router = Router();
  
  // Kie.ai webhook
  router.post('/kieai', async (req: Request, res: Response) => {
    const { taskId, model, state, resultJson, failMsg } = req.body;
    
    console.log(`[Webhook] Kie.ai: taskId=${taskId}, state=${state}`);
    
    try {
      if (state === 'success') {
        const resultUrls = JSON.parse(resultJson).resultUrls;
        await handleTaskCompleted(taskId, taskId, model, '', {
          status: 'done',
          resultUrls,
        });
      } else if (state === 'fail') {
        await handleTaskFailed(taskId, taskId, {
          status: 'failed',
          error: failMsg,
        }, model);
      }
      
      res.status(200).json({ received: true });
    } catch (error) {
      console.error('[Webhook] Error:', error);
      res.status(500).json({ error: 'Processing failed' });
    }
  });
  
  return router;
}
```

**Включение webhook в провайдере:**

```typescript
// При создании задачи
const requestBody = {
  model: 'kling-2.6',
  callBackUrl: `${process.env.APP_URL}/webhooks/kieai`, // ←
  input: {...}
};
```

**Выгода:**
- Мгновенное получение результата
- 0 polling вызовов для задач с webhook
- Fallback на polling если webhook не сработал

---

## Фаза 3: Упрощение обработки результатов

### 3.1 Консолидировать CompletionHandler и GenerationService

**Файл:** `server/features/media/media-processor.ts` (новый)

Создать единый сервис для обработки генерации:

```typescript
class MediaProcessor {
  constructor(
    private providerManager: ProviderManager,
    private databaseService: DatabaseService,
    private notificationService: NotificationService,
  ) {}
  
  async processGeneration(options: GenerateMediaOptions): Promise<void> {
    const { requestId, model } = options;
    const provider = this.providerManager.getProvider(model);
    
    try {
      await this.updateStatus(requestId, 'PROCESSING');
      
      const result = await provider.generate(options);
      
      if (isTaskCreatedResult(result)) {
        // Async провайдер
        await this.startAsyncTracking(requestId, result, model, options);
      } else {
        // Sync провайдер - результат сразу
        await this.saveSyncResult(requestId, result);
      }
    } catch (error) {
      await this.handleGenerationError(requestId, error, model);
      throw error;
    }
  }
  
  async handleTaskCompletion(
    requestId: number,
    taskId: string,
    model: MediaModel,
    prompt: string,
    status: TaskStatusResult
  ): Promise<void> {
    // Идемпотентность через атомарный CAS
    const claimed = await this.claimForCompletion(requestId);
    if (!claimed) return; // Уже обрабатывается
    
    try {
      const provider = this.providerManager.getProvider(model);
      
      // Получаем результат (из status или от провайдера)
      const files = status.resultUrls?.length
        ? await this.downloadFromUrls(status.resultUrls)
        : await provider.getTaskResult?.(taskId);
      
      // Сохраняем и уведомляем
      const savedFiles = await this.databaseService.saveFiles(requestId, files);
      await this.notificationService.sendTelegram(requestId, savedFiles, prompt);
      await this.notificationService.sendSSE(requestId, 'COMPLETED');
      
      await this.markCompleted(requestId);
      
      // Фоновая загрузка на imgbb
      this.backgroundImgbbUpload(savedFiles, requestId, prompt);
      
    } catch (error) {
      await this.markFailed(requestId, error);
      throw error;
    }
  }
  
  private async claimForCompletion(requestId: number): Promise<boolean> {
    const result = await prisma.mediaRequest.updateMany({
      where: {
        id: requestId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
      data: { status: 'COMPLETING' },
    });
    return result.count > 0;
  }
}
```

**Выгода:**
- Один сервис вместо двух
- Чёткое разделение ответственности
- Проще тестировать

### 3.2 Упростить идемпотентность

Вместо статуса COMPLETING использовать оптимистичную блокировку:

```typescript
async handleTaskCompletion(requestId: number, ...): Promise<void> {
  // Проверяем, не обработан ли уже
  const existing = await prisma.mediaRequest.findUnique({
    where: { id: requestId },
    select: { status: true, files: { select: { id: true } } },
  });
  
  if (existing?.status === 'COMPLETED' || existing?.files?.length > 0) {
    console.log(`[Completion] Already processed: requestId=${requestId}`);
    return; // Уже обработано
  }
  
  // Атомарно обновляем статус
  const claimed = await prisma.mediaRequest.updateMany({
    where: {
      id: requestId,
      status: { in: ['PENDING', 'PROCESSING'] },
      // Дополнительно: проверяем, что нет файлов
      files: { none: {} },
    },
    data: { status: 'PROCESSING' }, // Остаёмся в PROCESSING
  });
  
  if (claimed.count === 0) {
    console.log(`[Completion] Race condition: requestId=${requestId}`);
    return; // Другой процесс уже обрабатывает
  }
  
  // ... обработка
}
```

**Выгода:**
- Убираем лишний статус COMPLETING
- Проще логика
- Меньше переходов статуса

---

## Фаза 4: Рефакторинг ProviderManager

### 4.1 Автоматическая регистрация провайдеров

**Файл:** `server/features/media/providers/provider-manager.ts`

Использовать конфигурацию из config.ts:

```typescript
export function createProviderManager(): ProviderManager {
  const providers: Record<string, MediaProvider> = {};
  
  // Создаём провайдеры по конфигу
  const kieaiApiKey = process.env.KIEAI_API_KEY;
  if (kieaiApiKey) {
    providers.kieai = createUnifiedKieAiProvider({
      apiKey: kieaiApiKey,
      baseURL: 'https://api.kie.ai',
    });
  }
  
  return {
    getProvider(model: MediaModel): MediaProvider {
      const modelConfig = MEDIA_MODELS[model];
      if (!modelConfig) {
        throw new Error(`Unknown model: ${model}`);
      }
      
      const provider = providers[modelConfig.provider];
      if (!provider) {
        throw new Error(`Provider not configured: ${modelConfig.provider}`);
      }
      
      return provider;
    },
    
    getModelConfig(model: MediaModel) {
      return MEDIA_MODELS[model];
    },
    
    getAvailableModels() {
      return Object.entries(MEDIA_MODELS).map(([key, config]) => ({
        key,
        name: config.name,
        types: config.types,
        supportsImageInput: config.supportsImageInput,
        provider: config.provider,
      }));
    },
  };
}
```

**Выгода:**
- ProviderManager не знает о конкретных моделях
- Добавление модели = добавление записи в MEDIA_MODELS
- Нет дублирования маппинга

---

## Итоговая структура после рефакторинга

```
server/features/media/
├── providers/
│   ├── interfaces.ts              # Общие интерфейсы
│   ├── provider-manager.ts        # Фабрика провайдеров
│   ├── kieai/
│   │   ├── unified-provider.ts    # ← НОВЫЙ: 1 провайдер вместо 14
│   │   ├── interfaces.ts          # ← УПРОЩЁННЫЙ: 50 строк вместо 400
│   │   └── mappers.ts             # Helper функции маппинга
│   ├── gptunnel/
│   │   └── ...
│   └── laozhang/
│       └── ...
├── media-processor.ts             # ← НОВЫЙ: единый процессор
├── task-tracking.service.ts       # ← УЛУЧШЕННЫЙ: exponential backoff
├── database.service.ts
├── notification.service.ts        # ← НОВЫЙ: уведомления
└── routes/
    ├── generate.ts
    └── webhooks.ts                # ← НОВЫЙ: webhook handler
```

---

## План работ по шагам

### Шаг 1: Подготовка (1-2 часа)
- [ ] Создать `docs/ARCHITECTURE.md` с новой архитектурой
- [ ] Создать тестовые кейсы для текущей функциональности
- [ ] Зафиксировать текущее поведение (snapshot тесты)

### Шаг 2: Unified Kie.ai Provider (2-3 часа)
- [ ] Создать `providers/kieai/unified-provider.ts`
- [ ] Перенести конфигурации всех 14 моделей
- [ ] Реализовать универсальные `checkTaskStatus` и `getTaskResult`
- [ ] Написать тесты для provider

### Шаг 3: Упрощение интерфейсов (1 час)
- [ ] Создать новые унифицированные интерфейсы
- [ ] Обновить provider на использование новых интерфейсов
- [ ] Удалить старые специфичные интерфейсы

### Шаг 4: Exponential Backoff (1 час)
- [ ] Обновить `task-tracking.service.ts`
- [ ] Протестировать на разных сценариях (быстрые/долгие задачи)

### Шаг 5: Webhook support (2 часа)
- [ ] Создать `routes/webhooks.ts`
- [ ] Добавить обработку Kie.ai webhook
- [ ] Обновить provider для отправки callBackUrl
- [ ] Протестировать fallback на polling

### Шаг 6: Media Processor (2-3 часа)
- [ ] Создать `media-processor.ts`
- [ ] Перенести логику из `generation.service.ts` и `completion-handler.service.ts`
- [ ] Обновить роуты на использование нового сервиса

### Шаг 7: ProviderManager refactor (1 час)
- [ ] Упростить маппинг моделей
- [ ] Удалить жёсткие зависимости от конкретных моделей

### Шаг 8: Cleanup (1 час)
- [ ] Удалить старые 14 файлов провайдеров
- [ ] Удалить неиспользуемые интерфейсы
- [ ] Обновить документацию
- [ ] Прогнать линтер/тесты

### Шаг 9: Тестирование (2-3 часа)
- [ ] Интеграционные тесты для всех моделей
- [ ] Тесты на идемпотентность
- [ ] Тесты на обработку ошибок
- [ ] Нагрузочное тестирование polling

**Итого:** ~15-20 часов работы

---

## Ожидаемые результаты

### Метрики до/после:

| Метрика | До | После | Улучшение |
|---------|-----|-------|-----------|
| Файлов провайдеров Kie.ai | 14 | 1 | -93% |
| Строк кода (providers/kieai) | ~2500 | ~400 | -84% |
| Строк интерфейсов | ~400 | ~50 | -87% |
| API вызовов polling (3 мин задача) | 36 | 12 | -67% |
| Время добавления новой модели | 30 мин | 5 мин | -83% |

### Качественные улучшения:
- ✅ Проще понимать код (меньше файлов, меньше дублирования)
- ✅ Легче добавлять новые модели (просто конфиг)
- ✅ Меньше API вызовов (экономия квот и денег)
- ✅ Быстрее получение результата (webhook)
- ✅ Проще тестировать (меньше моков)

---

## Риски и mitigation

### Риск 1: Поломка существующей функциональности
**Mitigation:**
- Полное покрытие тестами перед рефакторингом
- Пошаговый рефакторинг с проверкой после каждого шага
- Feature flags для нового webhook функционала

### Риск 2: Webhook не сработает
**Mitigation:**
- Fallback на polling всегда активен
- Логирование всех webhook событий
- Алертинг на failed webhook delivery

### Риск 3: Экспоненциальная задержка замедлит реакцию
**Mitigation:**
- Первые 2 проверки всё ещё быстрые (2 сек + 5 сек)
- Мониторинг time-to-completion до/после
- Возможность настроить задержки через env

---

## Рекомендации по внедрению

1. **Начать с Phase 2 (Exponential Backoff)** — наименее рискованно, быстрая выгода
2. **Затем Phase 1 (Unified Provider)** — основная экономия кода
3. **Phase 3 (Media Processor)** — упрощение логики
4. **Phase 4 (Webhook)** — опционально, если Kie.ai стабильно доставляет webhook'и

## Заключение

**Рефакторинг целесообразен** — текущая архитектура избыточно сложная для однотипных провайдеров Kie.ai.

Предложенный план сохраняет всю функциональность при сокращении кода на ~60% и упрощении поддержки.
