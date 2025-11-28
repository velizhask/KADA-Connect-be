-- === Replace handle_new_user: create user row + auto-link legacy records ===
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role TEXT := 'student';
  matched_student_id BIGINT;
  matched_company_id BIGINT;
  rows_updated INT;
  msg TEXT;
BEGIN
  -- Extract role from user metadata if provided during signup
  IF NEW.raw_user_meta_data IS NOT NULL THEN
    user_role := COALESCE((NEW.raw_user_meta_data->>'role')::TEXT, 'student');
  END IF;

  -- Validate role
  IF user_role NOT IN ('student', 'company', 'admin') THEN
    user_role := 'student';
  END IF;

  -- Insert into public.users (safe, idempotent)
  INSERT INTO public.users (
    id, email, role, profile_completed, company_verified, created_at, updated_at
  )
  VALUES (
    NEW.id, NEW.email, user_role, false, false, NOW(), NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  --
  -- If email is null, we cannot match legacy records — log and exit.
  --
  IF NEW.email IS NULL THEN
    INSERT INTO public.migration_log (
      migration_type, source_table, source_id, target_user_id, status, error_message, created_at
    ) VALUES (
      'signup_no_email', 'auth.users', NULL, NEW.id, 'no_email', 'auth user has no email to match legacy records', NOW()
    );
    RETURN NEW;
  END IF;

  -- Try to find a matching student by email (case-insensitive)
  SELECT id INTO matched_student_id
  FROM public.students
  WHERE email_address IS NOT NULL
    AND lower(trim(email_address)) = lower(trim(NEW.email))
  LIMIT 1;

  IF matched_student_id IS NOT NULL THEN
    -- Attempt to set students.user_id only if currently NULL
    UPDATE public.students
    SET user_id = NEW.id
    WHERE id = matched_student_id
      AND (user_id IS NULL);

    GET DIAGNOSTICS rows_updated = ROW_COUNT;

    IF rows_updated > 0 THEN
      -- annotate users.legacy_id and migration_source if not set
      UPDATE public.users
      SET legacy_id = COALESCE(legacy_id, matched_student_id),
          migration_source = COALESCE(migration_source, 'students'),
          updated_at = NOW()
      WHERE id = NEW.id;

      INSERT INTO public.migration_log (
        migration_type, source_table, source_id, target_user_id, status, created_at, completed_at
      ) VALUES (
        'student_to_user', 'students', matched_student_id, NEW.id, 'completed', NOW(), NOW()
      );
    ELSE
      -- student already had a user_id (someone else linked it)
      INSERT INTO public.migration_log (
        migration_type, source_table, source_id, target_user_id, status, error_message, created_at
      ) VALUES (
        'student_to_user', 'students', matched_student_id, NEW.id, 'failed', 'student row already linked to another user', NOW()
      );
    END IF;

    RETURN NEW;
  END IF;

  -- No student match, try company (search email_address or contact_email)
  SELECT id INTO matched_company_id
  FROM public.companies
  WHERE (
      (email_address IS NOT NULL AND lower(trim(email_address)) = lower(trim(NEW.email)))
      OR (contact_email IS NOT NULL AND lower(trim(contact_email)) = lower(trim(NEW.email)))
    )
  LIMIT 1;

  IF matched_company_id IS NOT NULL THEN
    UPDATE public.companies
    SET user_id = NEW.id
    WHERE id = matched_company_id
      AND (user_id IS NULL);

    GET DIAGNOSTICS rows_updated = ROW_COUNT;

    IF rows_updated > 0 THEN
      UPDATE public.users
      SET legacy_id = COALESCE(legacy_id, matched_company_id),
          migration_source = COALESCE(migration_source, 'companies'),
          updated_at = NOW()
      WHERE id = NEW.id;

      INSERT INTO public.migration_log (
        migration_type, source_table, source_id, target_user_id, status, created_at, completed_at
      ) VALUES (
        'company_to_user', 'companies', matched_company_id, NEW.id, 'completed', NOW(), NOW()
      );
    ELSE
      INSERT INTO public.migration_log (
        migration_type, source_table, source_id, target_user_id, status, error_message, created_at
      ) VALUES (
        'company_to_user', 'companies', matched_company_id, NEW.id, 'failed', 'company row already linked to another user', NOW()
      );
    END IF;

    RETURN NEW;
  END IF;

  -- No match at all: record as no_match for visibility
  INSERT INTO public.migration_log (
    migration_type, source_table, source_id, target_user_id, status, error_message, created_at
  ) VALUES (
    'signup_no_match', 'none', NULL, NEW.id, 'no_match', 'no legacy student/company row matched by email', NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
