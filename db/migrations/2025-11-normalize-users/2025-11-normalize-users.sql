-- Migration: Normalize profile fields into `public.users`
-- - Move students.full_name, students.phone_number, students.email_address -> users
-- - Move companies.contact_person_name, companies.contact_email, companies.contact_phone_number -> users
-- Up: perform migration
-- Down: revert migration (recreate columns on students/companies and copy data back)

BEGIN;

-- 0) Create safe backups (only insert if backups are currently empty)
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename = 'students_backup') = 1 THEN
    IF (SELECT COUNT(*) FROM public.students_backup) = 0 THEN
      INSERT INTO public.students_backup SELECT * FROM public.students;
    END IF;
  END IF;

  IF (SELECT COUNT(*) FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename = 'companies_backup') = 1 THEN
    IF (SELECT COUNT(*) FROM public.companies_backup) = 0 THEN
      INSERT INTO public.companies_backup SELECT * FROM public.companies;
    END IF;
  END IF;
END$$;

-- 1) Add target columns to users (use text for phone columns to preserve formatting)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS contact_person_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone_number text;

-- 2) Migrate data from students -> users
-- 2a) Students that are already linked by user_id
UPDATE public.users u
SET full_name = COALESCE(u.full_name, s.full_name),
    phone_number = COALESCE(u.phone_number, s.phone_number::text)
FROM public.students s
WHERE s.user_id = u.id
  AND (s.full_name IS NOT NULL OR s.phone_number IS NOT NULL);

-- 2b) Students not linked by user_id but matching by email
UPDATE public.users u
SET full_name = COALESCE(u.full_name, s.full_name),
    phone_number = COALESCE(u.phone_number, s.phone_number::text)
FROM public.students s
WHERE s.user_id IS NULL
  AND s.email_address IS NOT NULL
  AND lower(trim(u.email)) = lower(trim(s.email_address))
  AND (s.full_name IS NOT NULL OR s.phone_number IS NOT NULL);

-- 3) Migrate data from companies -> users
-- 3a) Companies linked by user_id
UPDATE public.users u
SET contact_person_name = COALESCE(u.contact_person_name, c.contact_person_name),
    contact_email = COALESCE(u.contact_email, c.contact_email),
    contact_phone_number = COALESCE(u.contact_phone_number, c.contact_phone_number)
FROM public.companies c
WHERE c.user_id = u.id
  AND (c.contact_person_name IS NOT NULL OR c.contact_email IS NOT NULL OR c.contact_phone_number IS NOT NULL);

-- 3b) Companies not linked by user_id but matching by contact_email -> users.email
UPDATE public.users u
SET contact_person_name = COALESCE(u.contact_person_name, c.contact_person_name),
    contact_email = COALESCE(u.contact_email, c.contact_email),
    contact_phone_number = COALESCE(u.contact_phone_number, c.contact_phone_number)
FROM public.companies c
WHERE c.user_id IS NULL
  AND c.contact_email IS NOT NULL
  AND lower(trim(u.email)) = lower(trim(c.contact_email))
  AND (c.contact_person_name IS NOT NULL OR c.contact_email IS NOT NULL OR c.contact_phone_number IS NOT NULL);

-- NOTE: We do NOT attempt to overwrite users.email here; users.email is NOT NULL and authoritative.

-- 4) Drop moved columns from students/companies
ALTER TABLE public.students
  DROP COLUMN IF EXISTS full_name,
  DROP COLUMN IF EXISTS phone_number,
  DROP COLUMN IF EXISTS email_address;

ALTER TABLE public.companies
  DROP COLUMN IF EXISTS contact_person_name,
  DROP COLUMN IF EXISTS contact_email,
  DROP COLUMN IF EXISTS contact_phone_number;

COMMIT;

-- ==========================
-- DOWN (revert) - best-effort
-- ==========================
-- The following statements attempt to restore the dropped columns and copy data back from users.
-- They are intentionally separate from the 'Up' transaction so an operator can run them manually if needed.

/*
BEGIN;

-- 1) Re-create columns on students and companies
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone_number bigint,
  ADD COLUMN IF NOT EXISTS email_address text;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS contact_person_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone_number text;

-- 2) Copy data from users back to students (for linked rows)
UPDATE public.students s
SET full_name = COALESCE(s.full_name, u.full_name),
    phone_number = COALESCE(s.phone_number, (CASE WHEN u.phone_number ~ '^\\d+$' THEN u.phone_number::bigint ELSE NULL END)),
    email_address = COALESCE(s.email_address, u.email)
FROM public.users u
WHERE s.user_id = u.id;

-- 3) Copy data from users back to companies (for linked rows)
UPDATE public.companies c
SET contact_person_name = COALESCE(c.contact_person_name, u.contact_person_name),
    contact_email = COALESCE(c.contact_email, u.contact_email),
    contact_phone_number = COALESCE(c.contact_phone_number, u.contact_phone_number)
FROM public.users u
WHERE c.user_id = u.id;

COMMIT;
*/
