-- SQL скрипт для обновления значений enum перед применением миграции
-- Выполните этот скрипт вручную перед запуском prisma db push

-- Шаг 1: Обновляем существующие записи в MediaChat
UPDATE "MediaChat" SET "model" = 'NANO_BANANA_PRO_KIEAI' WHERE "model" = 'NANO_BANANA';
UPDATE "MediaChat" SET "model" = 'NANO_BANANA_PRO_KIEAI' WHERE "model" = 'NANO_BANANA_PRO';

-- Шаг 2: Обновляем существующие записи в MediaRequest
UPDATE "MediaRequest" SET "model" = 'NANO_BANANA_PRO_KIEAI' WHERE "model" = 'NANO_BANANA';
UPDATE "MediaRequest" SET "model" = 'NANO_BANANA_PRO_KIEAI' WHERE "model" = 'NANO_BANANA_PRO';

-- После выполнения этого скрипта запустите: bunx prisma db push