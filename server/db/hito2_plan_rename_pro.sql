-- ============================================================================
-- Hito 2 - Plan naming alignment (premium -> pro)
-- Keeps existing data and feature access while matching contractual terminology.
-- ============================================================================

BEGIN;

-- Rename plan if old premium row exists.
UPDATE plans
SET name = 'pro',
    display_name = 'Pro Plan',
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'premium'
  AND NOT EXISTS (SELECT 1 FROM plans WHERE name = 'pro');

-- If both exist, keep pro and migrate users from premium to pro.
DO $$
DECLARE
  premium_id INTEGER;
  pro_id INTEGER;
BEGIN
  SELECT id INTO premium_id FROM plans WHERE name = 'premium' LIMIT 1;
  SELECT id INTO pro_id FROM plans WHERE name = 'pro' LIMIT 1;

  IF premium_id IS NOT NULL AND pro_id IS NOT NULL THEN
    UPDATE user_plans
    SET plan_id = pro_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE plan_id = premium_id;

    UPDATE plan_features
    SET plan_id = pro_id
    WHERE plan_id = premium_id
      AND NOT EXISTS (
        SELECT 1 FROM plan_features pf2
        WHERE pf2.plan_id = pro_id
          AND pf2.feature_key = plan_features.feature_key
      );

    DELETE FROM plan_features WHERE plan_id = premium_id;
    DELETE FROM plans WHERE id = premium_id;
  END IF;
END $$;

COMMIT;
