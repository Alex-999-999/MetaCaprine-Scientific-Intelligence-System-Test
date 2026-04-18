-- ============================================================================
-- MVP Web - Complete Database Migration
-- Single consolidated migration file for clean deployment
-- Generated: February 4, 2026
-- ============================================================================

-- ============================================================================
-- CORE SCHEMA - Users and Scenarios
-- ============================================================================

-- Users table with email verification support
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  auth_user_id UUID UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  stripe_customer_id VARCHAR(255) UNIQUE,
  -- Email verification fields
  email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(255),
  email_verification_token_expires TIMESTAMP,
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for email verification token lookups
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Set existing users as verified (for backward compatibility)
UPDATE users SET email_verified = true WHERE email_verified = false AND id IN (SELECT id FROM users);

-- ============================================================================
-- Scenarios table (core entity - each scenario is an independent "snapshot")
-- ============================================================================
CREATE TABLE IF NOT EXISTS scenarios (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'milk_sale', 'transformation', 'lactation', 'yield', 'gestation', 'summary'
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_scenarios_user_id ON scenarios(user_id);

-- ============================================================================
-- MODULE 1: PRODUCTION DATA
-- ============================================================================
CREATE TABLE IF NOT EXISTS production_data (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  -- Production inputs
  daily_production_liters DECIMAL(10, 2),
  production_days INTEGER,
  animals_count INTEGER,
  -- Costs
  feed_cost_per_liter DECIMAL(10, 2),
  labor_cost_per_liter DECIMAL(10, 2),
  health_cost_per_liter DECIMAL(10, 2),
  infrastructure_cost_per_liter DECIMAL(10, 2),
  other_costs_per_liter DECIMAL(10, 2),
  -- Prices
  milk_price_per_liter DECIMAL(10, 2),
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(scenario_id)
);

CREATE INDEX IF NOT EXISTS idx_production_data_scenario_id ON production_data(scenario_id);

-- ============================================================================
-- MODULE 2: TRANSFORMATION DATA
-- ============================================================================

-- Main transformation_data table (legacy support)
CREATE TABLE IF NOT EXISTS transformation_data (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  -- Transformation inputs
  product_type VARCHAR(100), -- 'queso_fresco', 'queso_madurado', etc.
  product_type_custom VARCHAR(255), -- Custom product name
  liters_per_kg_product DECIMAL(10, 2),
  processing_cost_per_liter DECIMAL(10, 2),
  packaging_cost_per_kg DECIMAL(10, 2) DEFAULT 0,
  product_price_per_kg DECIMAL(10, 2), -- Legacy field, kept for backward compatibility
  -- Sales channels (3 channels: direct, distributors, third/mixed)
  sales_channel_direct_percentage DECIMAL(5, 2) DEFAULT 100.00,
  sales_channel_distributors_percentage DECIMAL(5, 2) DEFAULT 0.00,
  sales_channel_third_percentage DECIMAL(5, 2) DEFAULT 0.00,
  direct_sale_price_per_kg DECIMAL(10, 2),
  distributors_price_per_kg DECIMAL(10, 2),
  third_channel_price_per_kg DECIMAL(10, 2),
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(scenario_id),
  CONSTRAINT check_sales_channels_sum CHECK (
    COALESCE(sales_channel_direct_percentage, 0) + 
    COALESCE(sales_channel_distributors_percentage, 0) + 
    COALESCE(sales_channel_third_percentage, 0) = 100.00
  )
);

CREATE INDEX IF NOT EXISTS idx_transformation_data_scenario_id ON transformation_data(scenario_id);

-- Product Mix table (multiple products per scenario)
CREATE TABLE IF NOT EXISTS transformation_products (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  product_type VARCHAR(100) NOT NULL, -- 'queso_fresco', 'queso_madurado', 'yogurt', 'otro', etc.
  product_type_custom VARCHAR(255), -- Custom name when product_type = 'otro'
  distribution_percentage DECIMAL(5, 2) NOT NULL CHECK (distribution_percentage >= 0 AND distribution_percentage <= 100),
  liters_per_kg_product DECIMAL(10, 2) NOT NULL,
  processing_cost_per_liter DECIMAL(10, 2) NOT NULL DEFAULT 0,
  processing_cost_per_kg DECIMAL(10, 2) DEFAULT 0,
  packaging_cost_per_kg DECIMAL(10, 2) NOT NULL DEFAULT 0,
  packaging_cost_per_liter DECIMAL(10, 2) DEFAULT 0,
  -- Unit selection for costs
  processing_cost_unit VARCHAR(10) DEFAULT 'liter' CHECK (processing_cost_unit IN ('liter', 'kg')),
  packaging_cost_unit VARCHAR(10) DEFAULT 'kg' CHECK (packaging_cost_unit IN ('liter', 'kg')),
  -- Sales channels per product (3 channels: direct, distributors, third/mixed)
  sales_channel_direct_percentage DECIMAL(5, 2) DEFAULT 100.00,
  sales_channel_distributors_percentage DECIMAL(5, 2) DEFAULT 0.00,
  sales_channel_third_percentage DECIMAL(5, 2) DEFAULT 0.00,
  direct_sale_price_per_kg DECIMAL(10, 2),
  distributors_price_per_kg DECIMAL(10, 2),
  third_channel_price_per_kg DECIMAL(10, 2),
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_product_sales_channels_sum CHECK (
    COALESCE(sales_channel_direct_percentage, 0) + 
    COALESCE(sales_channel_distributors_percentage, 0) + 
    COALESCE(sales_channel_third_percentage, 0) = 100.00
  )
);

CREATE INDEX IF NOT EXISTS idx_transformation_products_scenario_id ON transformation_products(scenario_id);

-- ============================================================================
-- MODULE 3: SCIENTIFIC BREED INTELLIGENCE (INDEPENDENT MODULE)
-- ============================================================================

-- Breed Reference Table (Master Data - Scientific breed data with ECM calculations)
CREATE TABLE IF NOT EXISTS public.breed_reference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breed_name TEXT NOT NULL UNIQUE, -- e.g. "Saanen", "Alpine", "LaMancha"
  breed_key TEXT NOT NULL UNIQUE, -- slug for code: e.g. "saanen", "alpine"
  country_or_system TEXT, -- metadata: "USA (ADGA/DHI)", "FR (INRAE)", "NL", etc.
  source_tags TEXT[], -- ["ADGA", "DHI", "USDA"] for traceability
  notes TEXT, -- explanatory notes (herd size context, etc.)

  -- Core inputs (all in kg for consistency; L approximated via kg/1.03)
  milk_kg_yr NUMERIC NOT NULL, -- annual milk production in kg
  fat_pct NUMERIC NOT NULL, -- fat percentage
  protein_pct NUMERIC NOT NULL, -- protein percentage
  lact_days_avg NUMERIC NOT NULL, -- average lactation days
  lactations_lifetime_avg NUMERIC NOT NULL, -- average lactations per life

  -- Derived (precalculated for performance)
  fat_kg_yr NUMERIC NOT NULL,
  protein_kg_yr NUMERIC NOT NULL,
  fat_plus_protein_pct NUMERIC NOT NULL,
  fat_plus_protein_kg_yr NUMERIC NOT NULL,
  ecm_kg_yr NUMERIC NOT NULL, -- Energy Corrected Milk per year
  ecm_kg_lifetime NUMERIC NOT NULL, -- ECM lifetime (yr * lactations)

  -- Display helpers
  approx_liters_note TEXT, -- "≈ 1183 L/año (1 kg ≈ 1 L)"
  image_asset_key TEXT, -- key for breed image

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for ranking queries (most important for Module 3)
CREATE INDEX IF NOT EXISTS idx_breed_reference_rank ON public.breed_reference (ecm_kg_lifetime DESC);
CREATE INDEX IF NOT EXISTS idx_breed_reference_key ON public.breed_reference (breed_key);

-- User Breed Scenarios (custom simulations with overrides)
CREATE TABLE IF NOT EXISTS public.breed_scenarios (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
  breed_key TEXT NOT NULL REFERENCES breed_reference(breed_key),
  
  -- User overrides (optional)
  herd_size INTEGER DEFAULT 1,
  milk_kg_yr_override NUMERIC,
  fat_pct_override NUMERIC,
  protein_pct_override NUMERIC,
  lact_days_avg_override NUMERIC,
  lactations_lifetime_avg_override NUMERIC,

  -- Calculated results (stored for quick retrieval)
  calculated_fat_kg_yr NUMERIC,
  calculated_protein_kg_yr NUMERIC,
  calculated_ecm_kg_yr NUMERIC,
  calculated_ecm_kg_lifetime NUMERIC,
  calculated_ecm_kg_lifetime_total NUMERIC, -- herd total

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(scenario_id, breed_key)
);

COMMENT ON TABLE public.breed_reference IS 'Module 3: Scientific breed reference data with ECM calculations (INDEPENDENT MODULE)';
COMMENT ON TABLE public.breed_scenarios IS 'Module 3: User breed simulation scenarios with overrides';

-- ============================================================================
-- LEGACY MODULE 3: LACTATION DATA (Deprecated, kept for backward compatibility)
-- ============================================================================
CREATE TABLE IF NOT EXISTS lactation_data (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  -- Lactation inputs
  lactation_days INTEGER,
  dry_days INTEGER,
  productive_life_years DECIMAL(5, 2),
  replacement_rate DECIMAL(5, 2), -- percentage
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(scenario_id)
);

CREATE INDEX IF NOT EXISTS idx_lactation_data_scenario_id ON lactation_data(scenario_id);

COMMENT ON TABLE lactation_data IS 'DEPRECATED: Legacy manual lactation data. Module 3 now uses breed_reference and breed_scenarios instead.';

-- ============================================================================
-- BREED PROFILES (Scientific Database - Alternative approach, currently not in use)
-- ============================================================================
CREATE TABLE IF NOT EXISTS breed_profiles (
  id SERIAL PRIMARY KEY,
  breed_name VARCHAR(100) NOT NULL UNIQUE,
  breed_category VARCHAR(50) NOT NULL CHECK (breed_category IN ('dairy', 'dual_purpose', 'native')),
  
  -- Production characteristics (optimal management level)
  avg_daily_peak_liters DECIMAL(6, 2) NOT NULL,
  peak_day INTEGER NOT NULL,
  total_lactation_liters DECIMAL(10, 2) NOT NULL,
  standard_lactation_days INTEGER NOT NULL DEFAULT 305,
  persistence_rate DECIMAL(5, 2) NOT NULL,
  
  -- Milk composition
  fat_percentage DECIMAL(4, 2) NOT NULL,
  protein_percentage DECIMAL(4, 2) NOT NULL,
  lactose_percentage DECIMAL(4, 2) DEFAULT 4.80,
  total_solids_percentage DECIMAL(4, 2) NOT NULL,
  
  -- Reproductive cycle
  optimal_dry_period_days INTEGER DEFAULT 60,
  avg_calving_interval_days INTEGER DEFAULT 395,
  
  -- Management level adjustments
  low_management_multiplier DECIMAL(4, 2) DEFAULT 0.70,
  medium_management_multiplier DECIMAL(4, 2) DEFAULT 0.85,
  high_management_multiplier DECIMAL(4, 2) DEFAULT 0.95,
  
  -- References
  source VARCHAR(255),
  region VARCHAR(100),
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_breed_profiles_name ON breed_profiles(breed_name);
CREATE INDEX IF NOT EXISTS idx_breed_profiles_category ON breed_profiles(breed_category);

-- Lactation simulations table (linked to breed_profiles, currently not in use)
CREATE TABLE IF NOT EXISTS lactation_simulations (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  
  -- User inputs
  selected_breed VARCHAR(100) NOT NULL,
  management_level VARCHAR(20) NOT NULL CHECK (management_level IN ('low', 'medium', 'high', 'optimal')),
  target_lactation_days INTEGER,
  
  -- Calculated outputs
  calculated_daily_peak DECIMAL(10, 2),
  calculated_lactation_total DECIMAL(12, 2),
  calculated_persistence DECIMAL(5, 2),
  calculated_fat_kg DECIMAL(10, 2),
  calculated_protein_kg DECIMAL(10, 2),
  calculated_solids_kg DECIMAL(10, 2),
  calculated_lactose_kg DECIMAL(10, 2),
  
  -- Economic outputs
  calculated_milk_value DECIMAL(12, 2),
  calculated_solids_value DECIMAL(12, 2),
  
  -- Comparison data
  comparison_breeds JSONB,
  optimization_potential JSONB,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(scenario_id)
);

CREATE INDEX IF NOT EXISTS idx_lactation_simulations_scenario ON lactation_simulations(scenario_id);
CREATE INDEX IF NOT EXISTS idx_lactation_simulations_breed ON lactation_simulations(selected_breed);

-- ============================================================================
-- YIELD DATA (Module 4 - Yield/Conversion module)
-- ============================================================================
CREATE TABLE IF NOT EXISTS yield_data (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  -- Yield inputs
  conversion_rate DECIMAL(10, 4), -- liters to product conversion
  efficiency_percentage DECIMAL(5, 2),
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(scenario_id)
);

CREATE INDEX IF NOT EXISTS idx_yield_data_scenario_id ON yield_data(scenario_id);

-- ============================================================================
-- GESTATION DATA (Module 5 - Reproductive calendar)
-- ============================================================================
CREATE TABLE IF NOT EXISTS gestation_data (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  gestation_data JSONB,
  calculated_gestation_timeline JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(scenario_id)
);

CREATE INDEX IF NOT EXISTS idx_gestation_data_scenario_id ON gestation_data(scenario_id);

-- PRO gestation model tables (timeline/events/stage pedagogy/alerts)
CREATE TABLE IF NOT EXISTS gestations (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  breed_key TEXT,
  gestation_days INTEGER NOT NULL DEFAULT 150,
  doe_count INTEGER NOT NULL DEFAULT 1,
  expected_kids_per_doe NUMERIC(6,2) DEFAULT 1.70,
  pregnancy_loss_pct NUMERIC(5,2) DEFAULT 8.00,
  reminder_window_days INTEGER DEFAULT 14,
  management_level VARCHAR(20) DEFAULT 'standard',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(scenario_id)
);

CREATE INDEX IF NOT EXISTS idx_gestations_service_date ON gestations(service_date);

CREATE TABLE IF NOT EXISTS gestation_events (
  id SERIAL PRIMARY KEY,
  gestation_id INTEGER NOT NULL REFERENCES gestations(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  event_day INTEGER NOT NULL,
  event_date DATE NOT NULL,
  event_type VARCHAR(20) DEFAULT 'info',
  title TEXT,
  description TEXT,
  status VARCHAR(20) DEFAULT 'upcoming',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(gestation_id, event_key, event_day)
);

CREATE INDEX IF NOT EXISTS idx_gestation_events_date ON gestation_events(event_date);

CREATE TABLE IF NOT EXISTS gestation_stage_data (
  id SERIAL PRIMARY KEY,
  gestation_id INTEGER NOT NULL REFERENCES gestations(id) ON DELETE CASCADE,
  stage_key VARCHAR(20) NOT NULL,
  day_start INTEGER NOT NULL,
  day_end INTEGER NOT NULL,
  physiological_status TEXT,
  risk_level VARCHAR(20),
  nutrition JSONB,
  health JSONB,
  management JSONB,
  illustration_path TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(gestation_id, stage_key)
);

CREATE TABLE IF NOT EXISTS user_alerts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  gestation_id INTEGER REFERENCES gestations(id) ON DELETE CASCADE,
  alert_key TEXT NOT NULL,
  alert_type VARCHAR(20) DEFAULT 'info',
  alert_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, scenario_id, alert_key, alert_date)
);

CREATE INDEX IF NOT EXISTS idx_user_alerts_alert_date ON user_alerts(alert_date);

-- ============================================================================
-- RESULTS TABLE (Calculated outputs - shared across all modules)
-- ============================================================================
CREATE TABLE IF NOT EXISTS results (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  -- Calculated results
  total_production_liters DECIMAL(12, 2),
  total_revenue DECIMAL(12, 2),
  total_costs DECIMAL(12, 2),
  gross_margin DECIMAL(12, 2),
  margin_percentage DECIMAL(5, 2),
  -- Additional metrics
  revenue_per_liter DECIMAL(10, 2),
  cost_per_liter DECIMAL(10, 2),
  -- Metadata
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(scenario_id)
);

CREATE INDEX IF NOT EXISTS idx_results_scenario_id ON results(scenario_id);

-- ============================================================================
-- PLANS AND ROLES STRUCTURE (Base for future subscription system)
-- ============================================================================

-- Plans table: Defines available subscription plans
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL, -- 'free', 'pro', 'enterprise'
  display_name VARCHAR(255) NOT NULL, -- 'Free Plan', 'Pro Plan', etc.
  description TEXT,
  price_monthly DECIMAL(10, 2) DEFAULT 0.00,
  price_yearly DECIMAL(10, 2) DEFAULT 0.00,
  features JSONB DEFAULT '[]'::jsonb, -- Array of feature keys enabled for this plan
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User plans: Links users to their current plan
CREATE TABLE IF NOT EXISTS user_plans (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'cancelled', 'expired', 'trial', 'past_due'
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP, -- NULL for lifetime plans
  billing_provider VARCHAR(50),
  external_customer_id VARCHAR(255),
  external_subscription_id VARCHAR(255),
  external_price_id VARCHAR(255),
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id) -- One active plan per user
);

CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON user_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plans_plan_id ON user_plans(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_plans_status ON user_plans(status);
CREATE INDEX IF NOT EXISTS idx_user_plans_external_subscription_id ON user_plans(external_subscription_id) WHERE external_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_plans_external_customer_id ON user_plans(external_customer_id) WHERE external_customer_id IS NOT NULL;

-- Plan features: Defines which features/modules are available per plan
-- This is a reference table for feature definitions
CREATE TABLE IF NOT EXISTS plan_features (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  feature_key VARCHAR(100) NOT NULL, -- 'module1', 'module2', 'module3', 'advanced_calculations', etc.
  feature_name VARCHAR(255) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(plan_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_plan_features_plan_id ON plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_features_feature_key ON plan_features(feature_key);

-- Seed default plans (Free and Pro)
INSERT INTO plans (name, display_name, description, price_monthly, price_yearly, features, is_active)
VALUES 
  (
    'free',
    'Free Plan',
    'Basic access to core modules',
    0.00,
    0.00,
    '["module1", "module4"]'::jsonb,
    true
  ),
  (
    'pro',
    'Pro Plan',
    'Full access to all modules and advanced features',
    0.00, -- Will be set when payment gateway is integrated
    0.00,
    '["module1", "module2", "module3", "module4", "module5", "advanced_calculations", "export_data"]'::jsonb,
    true
  )
ON CONFLICT (name) DO NOTHING;

-- Seed plan features for Free plan
INSERT INTO plan_features (plan_id, feature_key, feature_name, is_enabled)
SELECT id, 'module1', 'Module 1: Production & Direct Sales', true FROM plans WHERE name = 'free'
ON CONFLICT (plan_id, feature_key) DO NOTHING;

INSERT INTO plan_features (plan_id, feature_key, feature_name, is_enabled)
SELECT id, 'module4', 'Module 4: Cost Calculators', true FROM plans WHERE name = 'free'
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- Seed plan features for Pro plan
INSERT INTO plan_features (plan_id, feature_key, feature_name, is_enabled)
SELECT id, unnest(ARRAY['module1', 'module2', 'module3', 'module4', 'module5', 'advanced_calculations', 'export_data']), 
       unnest(ARRAY['Module 1: Production & Direct Sales', 'Module 2: Dairy Transformation', 'Module 3: Scientific Breed Intelligence', 'Module 4: Cost Calculators', 'Module 5: Reproductive Management', 'Advanced Calculations', 'Data Export']),
       true
FROM plans WHERE name = 'pro'
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- Set default plan for existing users (Free plan)
INSERT INTO user_plans (user_id, plan_id, status)
SELECT u.id, p.id, 'active'
FROM users u
CROSS JOIN plans p
WHERE p.name = 'free'
AND NOT EXISTS (SELECT 1 FROM user_plans up WHERE up.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN (
    'users', 'scenarios', 'production_data', 'transformation_data', 
    'transformation_products', 'breed_reference', 'breed_scenarios',
    'lactation_data', 'breed_profiles', 'lactation_simulations',
    'yield_data', 'gestation_data', 'gestations', 'gestation_events',
    'gestation_stage_data', 'user_alerts', 'results', 'plans', 'user_plans', 'plan_features'
  );
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Created/verified % tables', table_count;
  RAISE NOTICE '============================================================================';
  
  IF table_count < 20 THEN
    RAISE WARNING 'Expected at least 20 tables, got %. Some tables may not have been created.', table_count;
  END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next Steps:
-- 1. Run: node setup.js (direct DB seed) or node server/scripts/export-breed-reference-seed.js (generate Supabase import files)
-- 2. Verify all tables were created successfully
-- 3. Test application functionality
-- ============================================================================
