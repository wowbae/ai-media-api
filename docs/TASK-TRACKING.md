# Task Tracking Service - Документация

## Обзор

`task-tracking.service.ts` - сервис для автоматического отслеживания и периодической проверки статуса асинхронных задач генерации медиа.

## Архитектура

### Компоненты

1. **TaskTrackingService** - основной сервис
2. **SSE Service** - отправка real-time уведомлений
3. **Generation Service** - запуск отслеживания после создания задачи
4. **Recovery Service** - восстановление задач после перезапуска сервера

## Инициализация

TaskTrackingService автоматически запускается при старте сервера:

```typescript
// server/init.ts
import { getTaskTrackingService } from "./features/media/task-tracking.service";

const server = app.listen(serverConfig.port, () => {
  console.log(`🚀 Server is running on port ${serverConfig.port}`);
  
  // Инициализируем TaskTrackingService для восстановления задач
  getTaskTrackingService();
  console.log('✅ TaskTrackingService инициализирован');
});
```

### Восстановление задач после перезапуска

При старте сервера TaskTrackingService автоматически:

1. Находит в БД все задачи со статусом `PENDING` или `PROCESSING`
2. Проверяет возраст задачи (не старше 15 минут)
3. Запускает отслеживание для актуальных задач
4. Помечает как `FAILED` старые задачи (> 15 минут)

```
[TaskTracking] 🔄 Восстановление 3 незавершенных задач...
[TaskTracking] ✅ Восстановлено 2 из 3 задач
[TaskTracking] ⏰ Пропущена старая задача requestId=123: возраст 1200 сек
```

## Как это работает

### 1. Создание задачи

```typescript
// generation.service.ts
const result = await provider.generate(generateParams);

if (isTaskCreatedResult(result)) {
  // Сохраняем taskId в БД
  await prisma.mediaRequest.update({
    where: { id: requestId },
    data: { taskId: result.taskId, status: 'PENDING' },
  });

  // Получаем chatId и userId из БД
  const request = await prisma.mediaRequest.findUnique({
    where: { id: requestId },
    select: { chatId: true, chat: { select: { userId: true } } },
  });

  // Запускаем отслеживание
  const taskTrackingService = getTaskTrackingService();
  await taskTrackingService.startTracking({
    requestId,
    taskId: result.taskId,
    model,
    prompt,
    chatId: request.chatId,
    userId: request.chat.userId,
  });
}
```

### 2. Периодическая проверка статуса

TaskTrackingService проверяет статус каждые **5 секунд**:

```typescript
private startStatusCheckForTask(key: string, task: TrackedTask): void {
  const intervalId = setInterval(async () => {
    await this.checkTaskStatus(key, task);
  }, this.STATUS_CHECK_INTERVAL); // 5000ms
}
```

### 3. Обработка результатов

#### Успех (`status === 'done'`)
1. Отправка SSE уведомления `REQUEST_COMPLETED`
2. Вызов `handleTaskCompleted()` для сохранения файлов
3. Остановка проверки статуса

#### Ошибка (`status === 'failed'`)
1. Отправка SSE уведомления `REQUEST_FAILED`
2. Вызов `handleTaskFailed()` для записи ошибки
3. Остановка проверки статуса

#### Процесс (`status === 'pending' | 'processing'`)
1. Отправка SSE уведомления `REQUEST_PROCESSING`
2. Продолжение проверки статуса

### 4. Таймаут

Если задача выполняется дольше **10 минут**:
- Автоматическая остановка проверки
- Статус запроса устанавливается в `FAILED`
- Отправка SSE уведомления об ошибке

## Конфигурация

```typescript
private readonly STATUS_CHECK_INTERVAL = 5000; // 5 секунд между проверками
private readonly MAX_CHECK_TIME = 10 * 60 * 1000; // 10 минут макс. время
private readonly CLEANUP_INTERVAL = 60 * 1000; // Очистка каждую минуту
```

## SSE События

### REQUEST_PROCESSING
```typescript
{
  type: 'REQUEST_PROCESSING',
  requestId: number,
  chatId: number,
  status: 'PROCESSING',
  timestamp: string,
}
```

### REQUEST_COMPLETED
```typescript
{
  type: 'REQUEST_COMPLETED',
  requestId: number,
  chatId: number,
  status: 'COMPLETED',
  timestamp: string,
}
```

### REQUEST_FAILED
```typescript
{
  type: 'REQUEST_FAILED',
  requestId: number,
  chatId: number,
  status: 'FAILED',
  timestamp: string,
  data: {
    errorMessage: string,
  },
}
```

## Логирование

Сервис логирует все этапы:

```
[TaskTracking] Сервис запущен
[TaskTracking] 🎯 Начато отслеживание: requestId=869, taskId=637a1ad5805f72e87c7a2f5a21a0bb68
[TaskTracking] 📊 Статус задачи: requestId=869, status=processing, checkCount=3
[TaskTracking] ✅ Задача завершена: requestId=869
[TaskTracking] ⏹️ Остановлено отслеживание: requestId=869
```

## Статистика

```typescript
const stats = taskTrackingService.getStats();
console.log(stats);
// { totalTracked: 5, activeChecks: 3 }
```

## Преимущества

✅ **Автоматическое отслеживание** - не требует ручного запуска
✅ **Мгновенный старт** - без задержек в 30-70 сек
✅ **Real-time уведомления** - SSE push-уведомления клиенту
✅ **Таймаут** - защита от бесконечной проверки (10 минут)
✅ **Масштабируемость** - поддержка множества одновременных задач
✅ **Очистка** - автоматическое удаление старых задач

## Отличия от предыдущего подхода

### Было (Client-side polling)
- Фронтенд опрашивал `/api/requests/:id` каждые 7 секунд
- Задержка перед началом проверки (30-70 сек)
- Нагрузка на API endpoint
- Хук `useRequestPolling` на фронте

### Стало (Server-side status check + SSE)
- Сервер сам проверяет статус каждые 5 секунд
- Мгновенное начало проверки после создания задачи
- SSE push-уведомления вместо client-side polling
- Меньше нагрузка на сеть
- Нет лишнего кода на фронте

## Интеграция с новыми моделями

При добавлении новой модели **ничего дополнительно делать не нужно**! 

TaskTrackingService автоматически:
1. Запустится после создания задачи
2. Будет проверять статус через `provider.checkTaskStatus()`
3. Отправит SSE уведомления при изменении статуса

**Требования к провайдеру:**
- Должен поддерживать `checkTaskStatus()` метод
- Должен возвращать корректные статусы (`pending`, `processing`, `done`, `failed`)

## Терминология

В коде и документации используются следующие термины:

- **Status check** (проверка статуса) - периодическая проверка статуса задачи
- **Task tracking** (отслеживание задачи) - процесс наблюдения за задачей от создания до завершения
- **SSE push** - отправка уведомлений клиенту через Server-Sent Events

**Не используется:**
- ~~Polling~~ - заменено на "periodic status check" (периодическая проверка статуса)
