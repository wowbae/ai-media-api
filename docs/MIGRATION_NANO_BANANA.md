# Миграция моделей NANO_BANANA

## Проблема
Prisma не может удалить значения enum, если они используются в базе данных.

## Решение

### Вариант 1: Использование TypeScript скрипта (РЕКОМЕНДУЕТСЯ ⭐)

Самый простой способ - использовать готовый скрипт:

```bash
bunx tsx scripts/fix-nano-banana-models.ts
```

Скрипт автоматически обновит все записи в базе данных, заменив старые значения enum на новые.

После выполнения скрипта запустите:
```bash
bunx prisma db push
```

### Вариант 2: Ручное обновление через SQL

1. Подключитесь к базе данных:
```bash
psql -h 147.45.249.66 -p 5432 -U your_user -d next_test
```

2. Выполните SQL скрипт:
```bash
psql -h 147.45.249.66 -p 5432 -U your_user -d next_test < sql/update_nano_banana_models.sql
```

Или выполните SQL напрямую:
```sql
UPDATE "MediaChat" SET "model" = 'NANO_BANANA_PRO_KIEAI' WHERE "model" = 'NANO_BANANA';
UPDATE "MediaChat" SET "model" = 'NANO_BANANA_PRO_KIEAI' WHERE "model" = 'NANO_BANANA_PRO';
UPDATE "MediaRequest" SET "model" = 'NANO_BANANA_PRO_KIEAI' WHERE "model" = 'NANO_BANANA';
UPDATE "MediaRequest" SET "model" = 'NANO_BANANA_PRO_KIEAI' WHERE "model" = 'NANO_BANANA_PRO';
```

3. После обновления данных выполните:
```bash
bunx prisma db push
```

### Вариант 3: Использование Prisma Studio

1. Запустите Prisma Studio:
```bash
bunx prisma studio
```

2. Вручную обновите записи в таблицах MediaChat и MediaRequest
3. Запустите `bunx prisma db push`

## Примечание

PostgreSQL не позволяет напрямую удалять значения из enum. Старые значения `NANO_BANANA` и `NANO_BANANA_PRO` останутся в enum, но не будут использоваться, так как все существующие записи обновлены на `NANO_BANANA_PRO_KIEAI`.

Если нужно полностью удалить старые значения, потребуется более сложная миграция с пересозданием enum (CREATE TYPE -> ALTER TABLE -> DROP TYPE), но это обычно не требуется.