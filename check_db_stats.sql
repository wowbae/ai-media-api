-- Статистика по таблицам
SELECT 
  'MediaChat' as table_name,
  COUNT(*) as row_count
FROM "MediaChat"
UNION ALL
SELECT 
  'MediaRequest' as table_name,
  COUNT(*) as row_count
FROM "MediaRequest"
UNION ALL
SELECT 
  'MediaFile' as table_name,
  COUNT(*) as row_count
FROM "MediaFile";

-- Размеры таблиц
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('MediaChat', 'MediaRequest', 'MediaFile')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
