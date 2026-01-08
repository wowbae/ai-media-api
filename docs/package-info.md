# Информация о структуре зависимостей

## Разделение зависимостей

Проект использует разделение зависимостей для оптимизации установки на слабом сервере:

### `dependencies` (Production - устанавливаются на сервере)

Только пакеты, необходимые для работы API сервера:

- **@prisma/adapter-pg** - адаптер Prisma для PostgreSQL
- **@prisma/client** - Prisma клиент
- **cors** - CORS middleware для Express
- **dotenv** - загрузка переменных окружения
- **express** - веб-сервер
- **grammy** - Telegram Bot API
- **luxon** - работа с датами (используется в server/)
- **node-cron** - планировщик задач (cron jobs)
- **pg** - PostgreSQL клиент
- **prisma** - Prisma CLI (для миграций и generate)

**Размер:** ~50-100 MB (вместо 500+ MB со всеми зависимостями)

### `devDependencies` (Development - только на локальной машине)

Все остальные пакеты, нужные для разработки и сборки:

- **Frontend зависимости:** react, react-dom, @tanstack/*, tailwindcss и т.д.
- **Инструменты сборки:** vite, typescript, tsx
- **Инструменты разработки:** vitest, concurrently
- **UI библиотеки:** lucide-react, class-variance-authority и т.д.

**Размер:** ~400-500 MB (устанавливаются только локально)

## Скрипты

- `npm install --production` или `npm run install:server` - установка только backend пакетов (на сервере)
- `npm install` или `npm run install:all` - установка всех пакетов (на локальной машине)
- `npm run build` - сборка фронтенда (только на локальной машине)
- `npm start` или `npm run start:prod` - запуск сервера (использует tsx)

## Важно для сервера

Для запуска TypeScript на сервере нужен `tsx`:

**Вариант 1 (рекомендуется):** Установить глобально
```bash
npm install -g tsx
```

**Вариант 2:** Использовать через npx (PM2 настроен так)
```bash
# npx автоматически найдет tsx даже в devDependencies
npx tsx server/init.ts
```

## Процесс деплоя

1. **Локально:** `npm install` → `npm run build` → `git push`
2. **На сервере:** `git pull` → `npm install --production` → `pm2 restart`

Это значительно экономит ресурсы на слабом сервере!

