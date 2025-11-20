-- === Rollback: simpler handle_new_user (no linking logic) ===
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role TEXT := 'student';
BEGIN
  IF NEW.raw_user_meta_data IS NOT NULL THEN
    user_role := COALESCE((NEW.raw_user_meta_data->>'role')::TEXT, 'student');
  END IF;

  IF user_role NOT IN ('student', 'company', 'admin') THEN
    user_role := 'student';
  END IF;

  INSERT INTO public.users (
    id, email, role, profile_completed, company_verified, created_at, updated_at
  )
  VALUES (
    NEW.id, NEW.email, user_role, false, false, NOW(), NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
