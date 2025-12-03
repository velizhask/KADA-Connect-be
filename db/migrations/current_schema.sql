-- WARNING: This schema is for context only and is not meant to be run.
-- This file has been updated to reflect the actual schema on Supabase as of 2025-12-03

CREATE TABLE public.users (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role = ANY (ARRAY['student'::text, 'company'::text, 'admin'::text])),
  profile_completed boolean DEFAULT false,
  approved boolean NOT NULL DEFAULT false,
  legacy_id bigint,
  migration_source text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  full_name text,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

CREATE TABLE public.students (
  timestamp timestamptz,
  full_name text,
  status text,
  university_institution text,
  program_major text,
  preferred_industry text,
  tech_stack_skills text,
  self_introduction text,
  cv_upload text,
  profile_photo text,
  linkedin text,
  portfolio_link text,
  phone_number bigint,
  profile_photo_drive text,
  email_address text,
  employment_status text,
  id uuid NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  batch text CHECK (batch = ANY (ARRAY['Batch 1'::text, 'Batch 2'::text, 'Batch 3'::text)),
  CONSTRAINT students_pkey PRIMARY KEY (id)
  -- Note: No user_id column - linking is via students.id = users.id
  -- id is set via BEFORE INSERT trigger to match auth.uid()
);

CREATE TABLE public.companies (
  timestamp timestamptz,
  email_address text,
  company_name text,
  company_summary_description text,
  industry_sector text,
  company_website_link text,
  company_logo text,
  tech_roles_interest text,
  preferred_skillsets text,
  contact_person_name text,
  contact_email text,
  contact_phone_number text,
  contact_info_visible boolean,
  company_logo_drive text,
  id uuid NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  CONSTRAINT companies_pkey PRIMARY KEY (id)
  -- Note: No user_id column - linking is via companies.id = users.id
  -- id is set via BEFORE INSERT trigger to match auth.uid()
);

-- Note: The relationship is established by matching the UUID:
-- students.id = users.id (for student profiles)
-- companies.id = users.id (for company profiles)

-- Old backup tables (from migration)
CREATE TABLE public.students_backup (
  timestamp timestamptz,
  full_name text,
  status text,
  university_institution text,
  program_major text,
  preferred_industry text,
  tech_stack_skills text,
  self_introduction text,
  cv_upload text,
  profile_photo text,
  linkedin text,
  portfolio_link text,
  phone_number bigint,
  id bigint,
  profile_photo_drive text,
  email_address text,
  employment_status text,
  user_id uuid
);

CREATE TABLE public.companies_backup (
  timestamp timestamptz,
  email_address text,
  company_name text,
  company_summary_description text,
  industry_sector text,
  company_website_link text,
  company_logo text,
  tech_roles_interest text,
  preferred_skillsets text,
  contact_person_name text,
  contact_email text,
  contact_phone_number text,
  id bigint,
  contact_info_visible text,
  company_logo_drive text,
  user_id uuid
);

CREATE TABLE public.users_backup (
  id uuid,
  email text,
  role text,
  profile_completed boolean,
  company_verified boolean,
  legacy_id bigint,
  migration_source text,
  created_at timestamptz,
  updated_at timestamptz,
  full_name text
);

CREATE TABLE public.migration_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  migration_type text NOT NULL,
  source_table text NOT NULL,
  source_id bigint,
  target_user_id uuid,
  status text NOT NULL DEFAULT 'pending'::text,
  error_message text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT migration_log_pkey PRIMARY KEY (id)
);

-- Additional tables (from actual database)
CREATE TABLE public.file_metadata (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL CHECK (id > 0),
  bucket text NOT NULL,
  path text NOT NULL,
  original_name text NOT NULL,
  mime_type text NOT NULL,
  size bigint NOT NULL,
  user_id uuid,
  file_type text CHECK (file_type = ANY (ARRAY['cv'::text, 'photo'::text, 'logo'::text, 'document'::text)),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  student_id uuid,
  company_id uuid,
  CONSTRAINT file_metadata_pkey PRIMARY KEY (id),
  CONSTRAINT file_metadata_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT file_metadata_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT file_metadata_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);

CREATE TABLE public.auth_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  action varchar NOT NULL,
  ip_address inet,
  user_agent text,
  session_id varchar,
  success boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT auth_audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT auth_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.crud_logs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  timestamp timestamptz DEFAULT now(),
  user_id uuid,
  user_email text,
  operation text CHECK (operation = ANY (ARRAY['CREATE'::text, 'UPDATE'::text, 'DELETE'::text)),
  resource_type text CHECK (resource_type = ANY (ARRAY['student'::text, 'company'::text, 'user'::text, 'file'::text)),
  resource_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  request_id text,
  success boolean DEFAULT true,
  error_message text,
  route_path text,
  user_agent text,
  CONSTRAINT crud_logs_pkey PRIMARY KEY (id),
  CONSTRAINT crud_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.migration_progress (
  id integer NOT NULL DEFAULT nextval('migration_progress_id_seq'::regclass),
  step_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  started_at timestamp DEFAULT now(),
  completed_at timestamp,
  details jsonb,
  CONSTRAINT migration_progress_pkey PRIMARY KEY (id)
);
