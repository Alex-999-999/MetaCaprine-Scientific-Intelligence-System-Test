-- ============================================================================
-- Phase B - Dual-mode RLS policies
-- Keeps service_role compatibility while enabling authenticated owner access
-- through users.auth_user_id = auth.uid().
-- ============================================================================

BEGIN;

-- Helper function: resolve internal app user id from auth.uid()
CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT u.id
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1
$$;

-- USERS (self read/update)
DROP POLICY IF EXISTS users_authenticated_owner_select ON public.users;
CREATE POLICY users_authenticated_owner_select
ON public.users
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS users_authenticated_owner_update ON public.users;
CREATE POLICY users_authenticated_owner_update
ON public.users
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- USER PROFILES (self read/write)
DROP POLICY IF EXISTS user_profiles_authenticated_owner_all ON public.user_profiles;
CREATE POLICY user_profiles_authenticated_owner_all
ON public.user_profiles
FOR ALL
TO authenticated
USING (user_id = public.current_app_user_id())
WITH CHECK (user_id = public.current_app_user_id());

-- SCENARIOS (owner only)
DROP POLICY IF EXISTS scenarios_authenticated_owner_all ON public.scenarios;
CREATE POLICY scenarios_authenticated_owner_all
ON public.scenarios
FOR ALL
TO authenticated
USING (user_id = public.current_app_user_id())
WITH CHECK (user_id = public.current_app_user_id());

-- CHILD TABLES OWNED BY SCENARIO OWNER
DROP POLICY IF EXISTS production_data_authenticated_owner_all ON public.production_data;
CREATE POLICY production_data_authenticated_owner_all
ON public.production_data
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.scenarios s
    WHERE s.id = production_data.scenario_id
      AND s.user_id = public.current_app_user_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.scenarios s
    WHERE s.id = production_data.scenario_id
      AND s.user_id = public.current_app_user_id()
  )
);

DROP POLICY IF EXISTS transformation_data_authenticated_owner_all ON public.transformation_data;
CREATE POLICY transformation_data_authenticated_owner_all
ON public.transformation_data
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.scenarios s
    WHERE s.id = transformation_data.scenario_id
      AND s.user_id = public.current_app_user_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.scenarios s
    WHERE s.id = transformation_data.scenario_id
      AND s.user_id = public.current_app_user_id()
  )
);

DROP POLICY IF EXISTS transformation_products_authenticated_owner_all ON public.transformation_products;
CREATE POLICY transformation_products_authenticated_owner_all
ON public.transformation_products
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.scenarios s
    WHERE s.id = transformation_products.scenario_id
      AND s.user_id = public.current_app_user_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.scenarios s
    WHERE s.id = transformation_products.scenario_id
      AND s.user_id = public.current_app_user_id()
  )
);

DROP POLICY IF EXISTS lactation_data_authenticated_owner_all ON public.lactation_data;
CREATE POLICY lactation_data_authenticated_owner_all
ON public.lactation_data
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.scenarios s
    WHERE s.id = lactation_data.scenario_id
      AND s.user_id = public.current_app_user_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.scenarios s
    WHERE s.id = lactation_data.scenario_id
      AND s.user_id = public.current_app_user_id()
  )
);

DROP POLICY IF EXISTS yield_data_authenticated_owner_all ON public.yield_data;
CREATE POLICY yield_data_authenticated_owner_all
ON public.yield_data
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.scenarios s
    WHERE s.id = yield_data.scenario_id
      AND s.user_id = public.current_app_user_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.scenarios s
    WHERE s.id = yield_data.scenario_id
      AND s.user_id = public.current_app_user_id()
  )
);

DROP POLICY IF EXISTS gestation_data_authenticated_owner_all ON public.gestation_data;
CREATE POLICY gestation_data_authenticated_owner_all
ON public.gestation_data
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.scenarios s
    WHERE s.id = gestation_data.scenario_id
      AND s.user_id = public.current_app_user_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.scenarios s
    WHERE s.id = gestation_data.scenario_id
      AND s.user_id = public.current_app_user_id()
  )
);

DROP POLICY IF EXISTS results_authenticated_owner_all ON public.results;
CREATE POLICY results_authenticated_owner_all
ON public.results
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.scenarios s
    WHERE s.id = results.scenario_id
      AND s.user_id = public.current_app_user_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.scenarios s
    WHERE s.id = results.scenario_id
      AND s.user_id = public.current_app_user_id()
  )
);

DROP POLICY IF EXISTS breed_scenarios_authenticated_owner_all ON public.breed_scenarios;
CREATE POLICY breed_scenarios_authenticated_owner_all
ON public.breed_scenarios
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.scenarios s
    WHERE s.id = breed_scenarios.scenario_id
      AND s.user_id = public.current_app_user_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.scenarios s
    WHERE s.id = breed_scenarios.scenario_id
      AND s.user_id = public.current_app_user_id()
  )
);

DROP POLICY IF EXISTS lactation_simulations_authenticated_owner_all ON public.lactation_simulations;
CREATE POLICY lactation_simulations_authenticated_owner_all
ON public.lactation_simulations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.scenarios s
    WHERE s.id = lactation_simulations.scenario_id
      AND s.user_id = public.current_app_user_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.scenarios s
    WHERE s.id = lactation_simulations.scenario_id
      AND s.user_id = public.current_app_user_id()
  )
);

-- Reference/scientific read for authenticated users
-- + backend service_role read used by API server.
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

