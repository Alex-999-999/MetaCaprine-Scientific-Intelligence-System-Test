-- ============================================================================
-- Hito 2 - Billing and Plan Hardening
-- Adds Stripe billing identifiers needed for payment-backed PRO access.
-- Run this after complete_migration.sql on existing databases.
-- ============================================================================

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stripe_customer_id
  ON public.users (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

ALTER TABLE public.user_plans
  ADD COLUMN IF NOT EXISTS billing_provider VARCHAR(50);

ALTER TABLE public.user_plans
  ADD COLUMN IF NOT EXISTS external_customer_id VARCHAR(255);

ALTER TABLE public.user_plans
  ADD COLUMN IF NOT EXISTS external_subscription_id VARCHAR(255);

ALTER TABLE public.user_plans
  ADD COLUMN IF NOT EXISTS external_price_id VARCHAR(255);

ALTER TABLE public.user_plans
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP;

ALTER TABLE public.user_plans
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_user_plans_external_subscription_id
  ON public.user_plans (external_subscription_id)
  WHERE external_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_plans_external_customer_id
  ON public.user_plans (external_customer_id)
  WHERE external_customer_id IS NOT NULL;

COMMIT;
