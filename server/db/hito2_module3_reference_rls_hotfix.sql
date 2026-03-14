-- ==========================================================================
-- Hotfix: Module 3 reference data RLS read for backend/service role
-- Run this if /api/module3/breeds fails after RLS hardening.
-- ==========================================================================

BEGIN;

DROP POLICY IF EXISTS breed_reference_service_role_read ON public.breed_reference;
CREATE POLICY breed_reference_service_role_read
ON public.breed_reference
FOR SELECT
TO service_role
USING (true);

DROP POLICY IF EXISTS breed_profiles_service_role_read ON public.breed_profiles;
CREATE POLICY breed_profiles_service_role_read
ON public.breed_profiles
FOR SELECT
TO service_role
USING (true);

COMMIT;
