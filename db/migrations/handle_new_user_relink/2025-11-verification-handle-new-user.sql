-- 1) Berapa banyak students sudah linked
SELECT COUNT(*) AS linked_students
FROM public.students
WHERE user_id IS NOT NULL;

-- 2) List beberapa contoh students yang sudah linked
SELECT id, full_name, email_address, user_id
FROM public.students
WHERE user_id IS NOT NULL
LIMIT 10;

-- 3) Companies linked
SELECT COUNT(*) AS linked_companies FROM public.companies WHERE user_id IS NOT NULL;

-- 4) Migration status summary (use view migration_status)
SELECT * FROM public.migration_status ORDER BY migration_type, source_table;

-- 5) Recent migration log entries
SELECT created_at, migration_type, source_table, source_id, target_user_id, status, error_message
FROM public.migration_log
ORDER BY created_at DESC
LIMIT 50;
