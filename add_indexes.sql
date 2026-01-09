-- Add performance indexes for media tables

-- MediaChat indexes
CREATE INDEX IF NOT EXISTS "MediaChat_updatedAt_idx" ON "MediaChat"("updatedAt");
CREATE INDEX IF NOT EXISTS "MediaChat_createdAt_idx" ON "MediaChat"("createdAt");

-- MediaRequest indexes
CREATE INDEX IF NOT EXISTS "MediaRequest_chatId_idx" ON "MediaRequest"("chatId");
CREATE INDEX IF NOT EXISTS "MediaRequest_createdAt_idx" ON "MediaRequest"("createdAt");
CREATE INDEX IF NOT EXISTS "MediaRequest_status_idx" ON "MediaRequest"("status");
CREATE INDEX IF NOT EXISTS "MediaRequest_chatId_createdAt_idx" ON "MediaRequest"("chatId", "createdAt");

-- MediaFile indexes
CREATE INDEX IF NOT EXISTS "MediaFile_requestId_idx" ON "MediaFile"("requestId");
CREATE INDEX IF NOT EXISTS "MediaFile_createdAt_idx" ON "MediaFile"("createdAt");
CREATE INDEX IF NOT EXISTS "MediaFile_type_idx" ON "MediaFile"("type");
