-- ============================================================================
-- Hito 2 - Grant PRO access to a specific user for paywall validation
-- Usage: replace the email in target_user CTE and run in Supabase SQL Editor.
-- ============================================================================

BEGIN;

-- 1) Ensure pro_user role exists (alias of pro).
INSERT INTO roles (name, display_name, description)
VALUES ('pro_user', 'Pro User', 'Professional access alias role')
ON CONFLICT (name) DO NOTHING;

-- 2) Ensure pro_user has same permissions as pro.
INSERT INTO role_permissions (role_id, permission_id)
SELECT pro_user.id, rp.permission_id
FROM roles pro
JOIN roles pro_user ON pro_user.name = 'pro_user'
JOIN role_permissions rp ON rp.role_id = pro.id
WHERE pro.name = 'pro'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3) Set target user role to pro_user.
WITH target_user AS (
  SELECT id
  FROM users
  WHERE LOWER(email) = LOWER('ghostlady0613@gmail.com')
  LIMIT 1
),
target_role AS (
  SELECT id
  FROM roles
  WHERE name = 'pro_user'
  LIMIT 1
)
INSERT INTO user_roles (user_id, role_id)
SELECT tu.id, tr.id
FROM target_user tu
CROSS JOIN target_role tr
ON CONFLICT (user_id) DO UPDATE SET
  role_id = EXCLUDED.role_id,
  updated_at = CURRENT_TIMESTAMP;

-- 4) Ensure target user plan is pro (fallback premium if pro does not exist).
WITH target_user AS (
  SELECT id
  FROM users
  WHERE LOWER(email) = LOWER('ghostlady0613@gmail.com')
  LIMIT 1
),
target_plan AS (
  SELECT id
  FROM plans
  WHERE name IN ('pro', 'premium')
  ORDER BY CASE WHEN name = 'pro' THEN 0 ELSE 1 END
  LIMIT 1
)
INSERT INTO user_plans (user_id, plan_id, status, started_at, updated_at)
SELECT tu.id, tp.id, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM target_user tu
CROSS JOIN target_plan tp
ON CONFLICT (user_id) DO UPDATE SET
  plan_id = EXCLUDED.plan_id,
  status = 'active',
  updated_at = CURRENT_TIMESTAMP;

COMMIT;

-- Verification query:
-- SELECT u.email, r.name AS role_name, p.name AS plan_name, up.status
-- FROM users u
-- LEFT JOIN user_roles ur ON ur.user_id = u.id
-- LEFT JOIN roles r ON r.id = ur.role_id
-- LEFT JOIN user_plans up ON up.user_id = u.id
-- LEFT JOIN plans p ON p.id = up.plan_id
-- WHERE LOWER(u.email) = LOWER('REPLACE_WITH_YOUR_EMAIL');
