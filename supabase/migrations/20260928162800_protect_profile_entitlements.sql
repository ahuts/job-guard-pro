-- The profile tier is the source of truth for paid AI access. RLS restricts
-- which row a user can update, but does not protect individual columns.
-- Preserve existing rows and grants needed by signed billing functions.
REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT UPDATE (full_name, updated_at) ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO service_role;

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- The profile trigger creates new rows and service-role billing functions own
-- subscription_tier, subscription_status and stripe_customer_id.
DO $$
BEGIN
  IF has_column_privilege('authenticated', 'public.profiles', 'subscription_tier', 'UPDATE')
    OR has_column_privilege('authenticated', 'public.profiles', 'subscription_status', 'UPDATE')
    OR has_column_privilege('authenticated', 'public.profiles', 'stripe_customer_id', 'UPDATE')
    OR has_table_privilege('authenticated', 'public.profiles', 'INSERT')
  THEN
    RAISE EXCEPTION 'Client billing privileges remain on public.profiles';
  END IF;
END;
$$;
