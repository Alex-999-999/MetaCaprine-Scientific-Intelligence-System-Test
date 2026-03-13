-- ============================================================================
-- Phase A - Supabase Auth Mapping (Non-breaking)
-- Adds link between app users and Supabase auth.users identities.
-- ============================================================================

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);

COMMENT ON COLUMN public.users.auth_user_id IS 'Supabase auth.users.id mapping for RLS auth.uid() ownership checks';

COMMIT;
