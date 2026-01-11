-- Временное удаление индексов для диагностики
DROP INDEX IF EXISTS "MediaChat_updatedAt_idx";
DROP INDEX IF EXISTS "MediaChat_createdAt_idx";
DROP INDEX IF EXISTS "MediaRequest_chatId_idx";
DROP INDEX IF EXISTS "MediaRequest_createdAt_idx";
DROP INDEX IF EXISTS "MediaRequest_status_idx";
DROP INDEX IF EXISTS "MediaRequest_chatId_createdAt_idx";
DROP INDEX IF EXISTS "MediaFile_requestId_idx";
DROP INDEX IF EXISTS "MediaFile_createdAt_idx";
DROP INDEX IF EXISTS "MediaFile_type_idx";
