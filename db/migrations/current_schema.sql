-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.companies (
  timestamp timestamp with time zone,
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
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL UNIQUE CHECK (id > 0),
  contact_info_visible boolean,
  company_logo_drive text,
  user_id uuid UNIQUE,
  CONSTRAINT companies_pkey PRIMARY KEY (id),
  CONSTRAINT companies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.companies_backup (
  timestamp timestamp with time zone,
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
  contact_info_visible boolean,
  company_logo_drive text,
  user_id uuid
);
CREATE TABLE public.migration_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  migration_type text NOT NULL,
  source_table text NOT NULL,
  source_id bigint,
  target_user_id uuid,
  status text NOT NULL DEFAULT 'pending'::text,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT migration_log_pkey PRIMARY KEY (id)
);
CREATE TABLE public.students (
  timestamp timestamp with time zone,
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
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL UNIQUE CHECK (id > 0),
  profile_photo_drive text,
  email_address text,
  employment_status text,
  user_id uuid UNIQUE,
  CONSTRAINT students_pkey PRIMARY KEY (id),
  CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.students_backup (
  timestamp timestamp with time zone,
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
CREATE TABLE public.users (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role = ANY (ARRAY['student'::text, 'company'::text, 'admin'::text])),
  profile_completed boolean DEFAULT false,
  approved boolean NOT NULL DEFAULT false,
  legacy_id bigint,
  migration_source text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.users_backup (
  id uuid,
  email text,
  role text,
  profile_completed boolean,
  company_verified boolean,
  legacy_id bigint,
  migration_source text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);