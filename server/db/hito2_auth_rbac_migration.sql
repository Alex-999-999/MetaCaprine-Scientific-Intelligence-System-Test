-- ============================================================================
-- Hito 2 - Auth, Profile, RBAC, and Legal Foundations
-- Run this after complete_migration.sql
-- ============================================================================

-- User profile and legal acceptance
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_name VARCHAR(255),
  country VARCHAR(120),
  city VARCHAR(120),
  goats_count INTEGER CHECK (goats_count >= 0),
  transforms_products BOOLEAN DEFAULT false,
  age INTEGER CHECK (age >= 0),
  sex VARCHAR(20) CHECK (sex IN ('female', 'male', 'other', 'prefer_not_to_say')),
  preferred_currency VARCHAR(10) DEFAULT 'USD',
  accepted_terms BOOLEAN DEFAULT false,
  accepted_terms_version VARCHAR(50),
  accepted_terms_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_country ON user_profiles(country);
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferred_currency ON user_profiles(preferred_currency);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- RBAC foundation
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  permission_key VARCHAR(120) UNIQUE NOT NULL,
  permission_name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);

-- Seed roles
INSERT INTO roles (name, display_name, description)
VALUES
  ('free', 'Free', 'Basic access level'),
  ('pro', 'Pro', 'Professional access level'),
  ('admin', 'Admin', 'Reserved future administrative role')
ON CONFLICT (name) DO NOTHING;

-- Seed permissions
INSERT INTO permissions (permission_key, permission_name, description)
VALUES
  ('view_module1', 'View Module 1', 'Access production and raw milk module'),
  ('view_module2', 'View Module 2', 'Access dairy transformation module'),
  ('view_module3', 'View Module 3', 'Access breed comparison module'),
  ('view_module5', 'View Module 5', 'Access gestation module'),
  ('view_advanced_analysis', 'View Advanced Analysis', 'Access premium and advanced analysis features'),
  ('manage_account', 'Manage Account', 'Update profile and password'),
  ('manage_platform', 'Manage Platform', 'Reserved administrative permission')
ON CONFLICT (permission_key) DO NOTHING;

-- Seed role-permission mapping
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.permission_key IN ('view_module1', 'manage_account')
WHERE r.name = 'free'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.permission_key IN ('view_module1', 'view_module2', 'view_module3', 'view_module5', 'view_advanced_analysis', 'manage_account')
WHERE r.name IN ('pro', 'pro_user')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON 1 = 1
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Backfill profiles for existing users
INSERT INTO user_profiles (user_id, accepted_terms, accepted_terms_version, accepted_terms_at)
SELECT id, false, 'legacy', NULL
FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Backfill user roles for existing users
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE r.name = 'free'
AND NOT EXISTS (
  SELECT 1
  FROM user_roles ur
  WHERE ur.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

