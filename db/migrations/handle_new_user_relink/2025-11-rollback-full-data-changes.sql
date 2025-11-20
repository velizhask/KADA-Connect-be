-- WARNING: run only if you want to remove links created by migration logs
-- This will set user_id back to NULL for legacy rows that were 'completed' by migration_log

BEGIN;

-- For students
UPDATE public.students s
SET user_id = NULL
FROM public.migration_log m
WHERE m.status = 'completed'
  AND m.migration_type = 'student_to_user'
  AND m.source_table = 'students'
  AND m.source_id = s.id
  AND s.user_id = m.target_user_id;

-- For companies
UPDATE public.companies c
SET user_id = NULL
FROM public.migration_log m
WHERE m.status = 'completed'
  AND m.migration_type = 'company_to_user'
  AND m.source_table = 'companies'
  AND m.source_id = c.id
  AND c.user_id = m.target_user_id;

-- Optionally mark those migration_log rows as 'reverted'
UPDATE public.migration_log
SET status = 'reverted', completed_at = NOW()
WHERE status = 'completed' AND migration_type IN ('student_to_user','company_to_user');

COMMIT;
