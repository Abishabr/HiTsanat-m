-- ============================================================
-- 008_handle_new_user_upsert.sql
--
-- Replaces the existing handle_new_user() trigger function with
-- an upsert version that prevents duplicate member rows when an
-- auth user is created for an already-existing member email.
--
-- Behaviour:
--   • If no members row exists for the email → INSERT (new member)
--   • If a members row exists with auth_user_id IS NULL → UPDATE
--     auth_user_id to link the existing member (no duplicate)
--   • If a members row exists with auth_user_id already set →
--     DO NOTHING (the ON CONFLICT WHERE clause is not satisfied)
--
-- Requires: email TEXT UNIQUE NOT NULL on public.members
--           (already present in the base schema)
--
-- Depends on: deepseek_sql_20260424_7a7bde.sql (base schema)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.members (email, full_name, auth_user_id)
  VALUES (
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.id
  )
  ON CONFLICT (email)
  DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id
  WHERE public.members.auth_user_id IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger itself is already created in the base schema.
-- Re-create it here to ensure it points to the updated function.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

SELECT 'Migration 008_handle_new_user_upsert complete.' AS message;
