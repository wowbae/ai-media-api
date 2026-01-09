-- Проверяем индексы на таблицах
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('MediaChat', 'MediaRequest', 'MediaFile')
ORDER BY tablename, indexname;
