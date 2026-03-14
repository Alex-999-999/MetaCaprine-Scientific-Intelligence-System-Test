-- ============================================================================
-- Hito 2 - Supabase RLS Hardening
-- Purpose: close Security Advisor findings by enabling RLS and explicit policies.
--
-- IMPORTANT:
-- This codebase currently uses backend-managed auth with a local `users` table,
-- and server-side DB access via service credentials.
-- Because of that, user data tables are restricted to `service_role` here.
-- Public scientific reference tables allow authenticated read access.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1) ENABLE RLS ON ALL APPLICATION TABLES (public schema)
-- --------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transformation_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transformation_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lactation_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yield_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gestation_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breed_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lactation_simulations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.breed_reference ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breed_profiles ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- 2) SERVICE-ROLE-ONLY POLICIES FOR USER/BUSINESS DATA
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS users_service_role_only ON public.users;
CREATE POLICY users_service_role_only
ON public.users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS user_profiles_service_role_only ON public.user_profiles;
CREATE POLICY user_profiles_service_role_only
ON public.user_profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS password_reset_tokens_service_role_only ON public.password_reset_tokens;
CREATE POLICY password_reset_tokens_service_role_only
ON public.password_reset_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS roles_service_role_only ON public.roles;
CREATE POLICY roles_service_role_only
ON public.roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS user_roles_service_role_only ON public.user_roles;
CREATE POLICY user_roles_service_role_only
ON public.user_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS permissions_service_role_only ON public.permissions;
CREATE POLICY permissions_service_role_only
ON public.permissions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS role_permissions_service_role_only ON public.role_permissions;
CREATE POLICY role_permissions_service_role_only
ON public.role_permissions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS plans_service_role_only ON public.plans;
CREATE POLICY plans_service_role_only
ON public.plans
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS user_plans_service_role_only ON public.user_plans;
CREATE POLICY user_plans_service_role_only
ON public.user_plans
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS plan_features_service_role_only ON public.plan_features;
CREATE POLICY plan_features_service_role_only
ON public.plan_features
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS scenarios_service_role_only ON public.scenarios;
CREATE POLICY scenarios_service_role_only
ON public.scenarios
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS production_data_service_role_only ON public.production_data;
CREATE POLICY production_data_service_role_only
ON public.production_data
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS transformation_data_service_role_only ON public.transformation_data;
CREATE POLICY transformation_data_service_role_only
ON public.transformation_data
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS transformation_products_service_role_only ON public.transformation_products;
CREATE POLICY transformation_products_service_role_only
ON public.transformation_products
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS lactation_data_service_role_only ON public.lactation_data;
CREATE POLICY lactation_data_service_role_only
ON public.lactation_data
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS yield_data_service_role_only ON public.yield_data;
CREATE POLICY yield_data_service_role_only
ON public.yield_data
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS gestation_data_service_role_only ON public.gestation_data;
CREATE POLICY gestation_data_service_role_only
ON public.gestation_data
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS results_service_role_only ON public.results;
CREATE POLICY results_service_role_only
ON public.results
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS breed_scenarios_service_role_only ON public.breed_scenarios;
CREATE POLICY breed_scenarios_service_role_only
ON public.breed_scenarios
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS lactation_simulations_service_role_only ON public.lactation_simulations;
CREATE POLICY lactation_simulations_service_role_only
ON public.lactation_simulations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- --------------------------------------------------------------------------
-- 3) REFERENCE DATA READ
-- Keep authenticated read + allow backend service_role read used by API server.
-- --------------------------------------------------------------------------
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

DROP POLICY IF EXISTS breed_reference_authenticated_read ON public.breed_reference;
CREATE POLICY breed_reference_authenticated_read
ON public.breed_reference
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS breed_profiles_authenticated_read ON public.breed_profiles;
CREATE POLICY breed_profiles_authenticated_read
ON public.breed_profiles
FOR SELECT
TO authenticated
USING (true);

COMMIT;

