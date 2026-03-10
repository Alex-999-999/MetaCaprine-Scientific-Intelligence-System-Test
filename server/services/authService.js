/**
 * Authentication Service
 * Business logic for user authentication, registration, profile management,
 * password recovery, and email verification.
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getPool } from '../db/pool.js';
import { generateToken } from '../middleware/auth.js';
import { getUserFeatures } from './planService.js';
import { sendPasswordResetEmail, sendVerificationEmail } from './emailService.js';

const DEFAULT_TERMS_VERSION = 'hito2-v1';
const DEFAULT_ROLE = 'free';

function normalizeNullableText(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNullableInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }
  return Boolean(value);
}

async function assignDefaultRole(client, userId, roleName = DEFAULT_ROLE) {
  const roleResult = await client.query(
    'SELECT id FROM roles WHERE name = $1 LIMIT 1',
    [roleName]
  );

  if (roleResult.rows.length === 0) {
    throw new Error(`Role '${roleName}' not found. Run the Hito 2 auth/RBAC migration first.`);
  }

  await client.query(
    `INSERT INTO user_roles (user_id, role_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET
       role_id = EXCLUDED.role_id,
       updated_at = CURRENT_TIMESTAMP`,
    [userId, roleResult.rows[0].id]
  );
}

async function hydrateUser(userId, client = null) {
  const executor = client || getPool();
  const result = await executor.query(
    `SELECT
      u.id,
      u.email,
      u.name,
      u.email_verified,
      up.last_name,
      up.country,
      up.city,
      up.goats_count,
      up.transforms_products,
      up.age,
      up.sex,
      up.preferred_currency,
      up.accepted_terms,
      up.accepted_terms_version,
      up.accepted_terms_at,
      r.name AS role,
      r.display_name AS role_display_name
     FROM users u
     LEFT JOIN user_profiles up ON up.user_id = u.id
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE u.id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  const user = result.rows[0];
  let features = [];
  try {
    features = await getUserFeatures(userId);
  } catch (error) {
    console.warn('Could not load user features:', error.message);
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    email_verified: user.email_verified,
    last_name: user.last_name,
    country: user.country,
    city: user.city,
    goats_count: user.goats_count,
    transforms_products: user.transforms_products,
    age: user.age,
    sex: user.sex,
    preferred_currency: user.preferred_currency || 'USD',
    accepted_terms: user.accepted_terms,
    accepted_terms_version: user.accepted_terms_version,
    accepted_terms_at: user.accepted_terms_at,
    role: user.role || DEFAULT_ROLE,
    role_display_name: user.role_display_name || 'Free',
    features,
  };
}

export async function registerUser(payload) {
  const pool = getPool();
  const {
    email,
    password,
    name,
    last_name,
    country,
    city,
    goats_count,
    transforms_products,
    age,
    sex,
    preferred_currency,
    accepted_terms,
    accepted_terms_version,
  } = payload;

  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  if (!normalizeBoolean(accepted_terms)) {
    throw new Error('Terms and conditions must be accepted');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const tokenExpires = new Date();
  tokenExpires.setHours(tokenExpires.getHours() + 24);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, name, email_verified, email_verification_token, email_verification_token_expires)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [email, passwordHash, normalizeNullableText(name) || email, false, verificationToken, tokenExpires]
    );

    const userId = userResult.rows[0].id;

    await client.query(
      `INSERT INTO user_profiles (
         user_id, last_name, country, city, goats_count, transforms_products,
         age, sex, preferred_currency, accepted_terms, accepted_terms_version, accepted_terms_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
         last_name = EXCLUDED.last_name,
         country = EXCLUDED.country,
         city = EXCLUDED.city,
         goats_count = EXCLUDED.goats_count,
         transforms_products = EXCLUDED.transforms_products,
         age = EXCLUDED.age,
         sex = EXCLUDED.sex,
         preferred_currency = EXCLUDED.preferred_currency,
         accepted_terms = EXCLUDED.accepted_terms,
         accepted_terms_version = EXCLUDED.accepted_terms_version,
         accepted_terms_at = EXCLUDED.accepted_terms_at,
         updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        normalizeNullableText(last_name),
        normalizeNullableText(country),
        normalizeNullableText(city),
        normalizeNullableInteger(goats_count),
        normalizeBoolean(transforms_products),
        normalizeNullableInteger(age),
        normalizeNullableText(sex),
        normalizeNullableText(preferred_currency) || 'USD',
        true,
        normalizeNullableText(accepted_terms_version) || DEFAULT_TERMS_VERSION,
      ]
    );

    await assignDefaultRole(client, userId);
    await client.query('COMMIT');

    const user = await hydrateUser(userId);
    const emailSent = await sendVerificationEmail(email, user.name, verificationToken);
    const token = generateToken(user.id, user.email);

    return { user, token, email_sent: emailSent };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function loginUser(email, password) {
  const pool = getPool();
  const result = await pool.query(
    'SELECT id, email, password_hash FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid credentials');
  }

  const user = result.rows[0];
  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    throw new Error('Invalid credentials');
  }

  const hydratedUser = await hydrateUser(user.id);
  const token = generateToken(user.id, user.email);
  return { user: hydratedUser, token };
}

export async function getUserById(userId) {
  return hydrateUser(userId);
}

export async function updateUserProfile(userId, payload) {
  const pool = getPool();
  const {
    name,
    last_name,
    country,
    city,
    goats_count,
    transforms_products,
    age,
    sex,
    preferred_currency,
  } = payload;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (name !== undefined) {
      await client.query(
        `UPDATE users
         SET name = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [normalizeNullableText(name), userId]
      );
    }

    await client.query(
      `INSERT INTO user_profiles (
         user_id, last_name, country, city, goats_count, transforms_products,
         age, sex, preferred_currency
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id) DO UPDATE SET
         last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
         country = COALESCE(EXCLUDED.country, user_profiles.country),
         city = COALESCE(EXCLUDED.city, user_profiles.city),
         goats_count = COALESCE(EXCLUDED.goats_count, user_profiles.goats_count),
         transforms_products = COALESCE(EXCLUDED.transforms_products, user_profiles.transforms_products),
         age = COALESCE(EXCLUDED.age, user_profiles.age),
         sex = COALESCE(EXCLUDED.sex, user_profiles.sex),
         preferred_currency = COALESCE(EXCLUDED.preferred_currency, user_profiles.preferred_currency),
         updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        normalizeNullableText(last_name),
        normalizeNullableText(country),
        normalizeNullableText(city),
        normalizeNullableInteger(goats_count),
        transforms_products === undefined ? null : normalizeBoolean(transforms_products),
        normalizeNullableInteger(age),
        normalizeNullableText(sex),
        normalizeNullableText(preferred_currency),
      ]
    );

    await client.query('COMMIT');
    return hydrateUser(userId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateUserPassword(userId, currentPassword, newPassword) {
  const pool = getPool();
  if (!currentPassword || !newPassword) {
    throw new Error('Current password and new password are required');
  }

  const result = await pool.query(
    'SELECT password_hash FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  const validPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!validPassword) {
    throw new Error('Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await pool.query(
    `UPDATE users
     SET password_hash = $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [passwordHash, userId]
  );

  return { success: true, message: 'Password updated successfully' };
}

export async function requestPasswordReset(email) {
  const pool = getPool();
  if (!email) {
    throw new Error('Email is required');
  }

  const result = await pool.query(
    'SELECT id, email, name FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    return {
      success: true,
      message: 'If an account exists for that email, a password reset link has been sent.',
    };
  }

  const user = result.rows[0];
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await pool.query(
    `UPDATE password_reset_tokens
     SET used_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
       AND used_at IS NULL
       AND expires_at > CURRENT_TIMESTAMP`,
    [user.id]
  );

  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, resetToken, expiresAt]
  );

  await sendPasswordResetEmail(user.email, user.name, resetToken);

  return {
    success: true,
    message: 'If an account exists for that email, a password reset link has been sent.',
  };
}

export async function resetPassword(resetToken, newPassword) {
  const pool = getPool();
  if (!resetToken || !newPassword) {
    throw new Error('Reset token and new password are required');
  }

  const result = await pool.query(
    `SELECT prt.id, prt.user_id
     FROM password_reset_tokens prt
     WHERE prt.token = $1
       AND prt.used_at IS NULL
       AND prt.expires_at > CURRENT_TIMESTAMP
     LIMIT 1`,
    [resetToken]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid or expired password reset token');
  }

  const record = result.rows[0];
  const passwordHash = await bcrypt.hash(newPassword, 10);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE users
       SET password_hash = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [passwordHash, record.user_id]
    );
    await client.query(
      `UPDATE password_reset_tokens
       SET used_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [record.id]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return { success: true, message: 'Password reset successfully' };
}

export async function verifyEmail(token) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, email_verified, email_verification_token_expires
     FROM users
     WHERE email_verification_token = $1`,
    [token]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid verification token');
  }

  const user = result.rows[0];
  if (user.email_verified) {
    throw new Error('Email already verified');
  }
  if (new Date() > new Date(user.email_verification_token_expires)) {
    throw new Error('Verification token expired');
  }

  await pool.query(
    `UPDATE users
     SET email_verified = true,
         email_verification_token = NULL,
         email_verification_token_expires = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [user.id]
  );

  return {
    success: true,
    message: 'Email verified successfully! You now have full access to the platform.',
  };
}

export async function resendVerificationEmail(userId) {
  const pool = getPool();
  const result = await pool.query(
    'SELECT id, email, name, email_verified FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  const user = result.rows[0];
  if (user.email_verified) {
    throw new Error('Email already verified');
  }

  const verificationToken = crypto.randomBytes(32).toString('hex');
  const tokenExpires = new Date();
  tokenExpires.setHours(tokenExpires.getHours() + 24);

  await pool.query(
    `UPDATE users
     SET email_verification_token = $1,
         email_verification_token_expires = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [verificationToken, tokenExpires, userId]
  );

  const emailSent = await sendVerificationEmail(user.email, user.name, verificationToken);
  if (!emailSent) {
    throw new Error('Failed to send verification email');
  }

  return {
    success: true,
    message: 'Verification email sent. Please check your inbox.',
  };
}
