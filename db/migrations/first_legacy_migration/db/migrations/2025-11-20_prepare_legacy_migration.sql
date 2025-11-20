-- 2025-11-20_prepare_legacy_migration.sql
-- Prepare legacy migration candidates and provide linking function.
-- Safe to run multiple times (idempotent). Does NOT insert into public.users directly.
-- Author: migration assistant

-- 0) Ensure pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

BEGIN;

----------------------------------------------------------------
-- 1) Create staging table for legacy user candidates
----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legacy_user_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('student','company')),
  legacy_id bigint NOT NULL,
  migration_source text NOT NULL, -- 'students' or 'companies'
  created_at timestamptz DEFAULT now(),
  processed boolean DEFAULT false,
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_legacy_candidates_email ON public.legacy_user_candidates (lower(email));
CREATE INDEX IF NOT EXISTS idx_legacy_candidates_source ON public.legacy_user_candidates (migration_source, legacy_id);

----------------------------------------------------------------
-- 2) Insert candidates from students (only those with email_address)
--    Skip rows where a candidate already exists for same source+legacy_id
----------------------------------------------------------------
INSERT INTO public.legacy_user_candidates (email, role, legacy_id, migration_source)
SELECT lower(trim(s.email_address)), 'student', s.id, 'students'
FROM public.students s
LEFT JOIN public.legacy_user_candidates c
  ON c.migration_source = 'students' AND c.legacy_id = s.id
WHERE s.email_address IS NOT NULL
  AND trim(s.email_address) <> ''
  AND c.id IS NULL
ON CONFLICT DO NOTHING;

----------------------------------------------------------------
-- 3) Insert candidates from companies (only those with email_address OR contact_email)
----------------------------------------------------------------
INSERT INTO public.legacy_user_candidates (email, role, legacy_id, migration_source)
SELECT lower(trim(co.email_address)), 'company', co.id, 'companies'
FROM public.companies co
LEFT JOIN public.legacy_user_candidates c
  ON c.migration_source = 'companies' AND c.legacy_id = co.id
WHERE co.email_address IS NOT NULL
  AND trim(co.email_address) <> ''
  AND co.email_address IS NOT NULL
  AND c.id IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.legacy_user_candidates (email, role, legacy_id, migration_source)
SELECT lower(trim(co.contact_email)), 'company', co.id, 'companies'
FROM public.companies co
LEFT JOIN public.legacy_user_candidates c
  ON c.migration_source = 'companies' AND c.legacy_id = co.id
WHERE co.contact_email IS NOT NULL
  AND trim(co.contact_email) <> ''
  AND c.id IS NULL
ON CONFLICT DO NOTHING;

----------------------------------------------------------------
-- 4) Create migration_log pending entries for each new candidate
--    (If migration_log rows already exist for same source+legacy_id and not removed, skip)
----------------------------------------------------------------
-- Note: Assumes public.migration_log exists as you showed earlier.
INSERT INTO public.migration_log (
  migration_type, source_table, source_id, target_user_id, status, created_at
)
SELECT
  CASE WHEN role = 'student' THEN 'student_to_user' ELSE 'company_to_user' END,
  migration_source,
  legacy_id,
  NULL::uuid,
  'pending',
  NOW()
FROM public.legacy_user_candidates cand
LEFT JOIN public.migration_log ml
  ON ml.source_table = cand.migration_source
  AND ml.source_id = cand.legacy_id
WHERE ml.id IS NULL
ON CONFLICT DO NOTHING;

----------------------------------------------------------------
-- 5) Create function that will perform linking for existing auth.users
--    This function should be run AFTER there are auth.users rows (e.g. when you bulk create auth users via Admin API),
--    OR can be scheduled to run periodically to pick up new auth.users.
----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.perform_legacy_link_for_existing_auth_users()
RETURNS integer AS $$
DECLARE
  rec RECORD;
  auth_rec RECORD;
  rows_ok INT := 0;
BEGIN
  -- Loop over candidate entries that are not yet processed
  FOR rec IN
    SELECT id, email, role, legacy_id, migration_source
    FROM public.legacy_user_candidates
    WHERE processed = false
  LOOP
    -- Find matching auth.user by email (case-insensitive)
    SELECT u.id, u.email INTO auth_rec
    FROM auth.users u
    WHERE lower(trim(u.email)) = lower(trim(rec.email))
    LIMIT 1;

    IF auth_rec.id IS NULL THEN
      -- No auth user for this email yet: leave as pending
      -- Update migration_log: ensure there's an entry 'no_auth_yet'
      INSERT INTO public.migration_log (migration_type, source_table, source_id, target_user_id, status, error_message, created_at)
      VALUES (
        CASE WHEN rec.role = 'student' THEN 'student_to_user' ELSE 'company_to_user' END,
        rec.migration_source,
        rec.legacy_id,
        NULL::uuid,
        'no_auth_yet',
        'No auth.users row for this email yet',
        NOW()
      )
      ON CONFLICT DO NOTHING;
      CONTINUE;
    END IF;

    -- If auth user exists, try to create public.users row (idempotent)
    BEGIN
      INSERT INTO public.users (id, email, role, profile_completed, company_verified, legacy_id, migration_source, created_at, updated_at)
      VALUES (
        auth_rec.id,
        auth_rec.email,
        rec.role,
        false,
        false,
        rec.legacy_id,
        rec.migration_source,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING;

      -- Update legacy table (students or companies) to set user_id if NULL
      IF rec.migration_source = 'students' THEN
        UPDATE public.students
        SET user_id = auth_rec.id
        WHERE id = rec.legacy_id
          AND (user_id IS NULL);
      ELSE
        UPDATE public.companies
        SET user_id = auth_rec.id
        WHERE id = rec.legacy_id
          AND (user_id IS NULL);
      END IF;

      -- Update migration_log: mark completed (either create new or update existing)
      INSERT INTO public.migration_log (migration_type, source_table, source_id, target_user_id, status, created_at, completed_at)
      VALUES (
        CASE WHEN rec.role = 'student' THEN 'student_to_user' ELSE 'company_to_user' END,
        rec.migration_source,
        rec.legacy_id,
        auth_rec.id,
        'completed',
        NOW(),
        NOW()
      )
      ON CONFLICT (source_table, source_id) DO UPDATE
      SET target_user_id = EXCLUDED.target_user_id,
          status = EXCLUDED.status,
          completed_at = EXCLUDED.completed_at;

      -- Mark candidate processed
      UPDATE public.legacy_user_candidates
      SET processed = true, processed_at = NOW()
      WHERE id = rec.id;

      rows_ok := rows_ok + 1;

    EXCEPTION WHEN others THEN
      -- Log errors per-row to migration_log
      INSERT INTO public.migration_log (migration_type, source_table, source_id, target_user_id, status, error_message, created_at)
      VALUES (
        CASE WHEN rec.role = 'student' THEN 'student_to_user' ELSE 'company_to_user' END,
        rec.migration_source,
        rec.legacy_id,
        auth_rec.id,
        'failed',
        SQLERRM,
        NOW()
      )
      ON CONFLICT DO NOTHING;
      -- continue to next candidate
    END;
  END LOOP;

  RETURN rows_ok;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

----------------------------------------------------------------
-- 6) Commit
----------------------------------------------------------------
COMMIT;

----------------------------------------------------------------
-- 7) Quick verification notes (run these manually after executing script)
----------------------------------------------------------------
-- SELECT count(*) FROM public.legacy_user_candidates WHERE processed = false;
-- SELECT * FROM public.migration_status ORDER BY migration_type, source_table;
-- SELECT * FROM public.migration_log ORDER BY created_at DESC LIMIT 50;

-- End of file
