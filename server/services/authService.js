/**
 * Authentication Service
 * Business logic for user authentication, registration, and email verification
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getPool } from '../db/pool.js';
import { generateToken } from '../middleware/auth.js';
import { sendVerificationEmail } from './emailService.js';

/**
 * Register a new user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} name - User name
 * @returns {Promise<{user: Object, token: string}>}
 */
export async function registerUser(email, password, name) {
  const pool = getPool();

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Generate verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const tokenExpires = new Date();
  tokenExpires.setHours(tokenExpires.getHours() + 24); // 24 hours expiration

  // Insert user
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name, email_verified, email_verification_token, email_verification_token_expires) 
     VALUES ($1, $2, $3, $4, $5, $6) 
     RETURNING id, email, name, email_verified`,
    [email, passwordHash, name || email, false, verificationToken, tokenExpires]
  );

  const user = result.rows[0];

  // Send verification email (non-blocking)
  sendVerificationEmail(email, user.name, verificationToken).catch(err => {
    console.error('Failed to send verification email:', err);
  });

  // Generate JWT token
  const token = generateToken(user.id, user.email);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      email_verified: user.email_verified
    },
    token
  };
}

/**
 * Authenticate user login
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{user: Object, token: string}>}
 * @throws {Error} If credentials are invalid
 */
export async function loginUser(email, password) {
  const pool = getPool();

  // Find user by email
  const result = await pool.query(
    'SELECT id, email, password_hash, name FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid credentials');
  }

  const user = result.rows[0];

  // Verify password
  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    throw new Error('Invalid credentials');
  }

  // Get email verification status
  const userResult = await pool.query(
    'SELECT email_verified FROM users WHERE id = $1',
    [user.id]
  );

  // Generate JWT token
  const token = generateToken(user.id, user.email);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      email_verified: userResult.rows[0]?.email_verified || false
    },
    token
  };
}

/**
 * Get user by ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} User object
 */
export async function getUserById(userId) {
  const pool = getPool();

  const result = await pool.query(
    'SELECT id, email, name, email_verified FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  return result.rows[0];
}

/**
 * Verify user email with token
 * @param {string} token - Verification token
 * @returns {Promise<Object>} Success message
 * @throws {Error} If token is invalid or expired
 */
export async function verifyEmail(token) {
  const pool = getPool();

  // Find user by token
  const result = await pool.query(
    `SELECT id, email, name, email_verified, email_verification_token_expires 
     FROM users 
     WHERE email_verification_token = $1`,
    [token]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid verification token');
  }

  const user = result.rows[0];

  // Check if already verified
  if (user.email_verified) {
    throw new Error('Email already verified');
  }

  // Check if token expired
  if (new Date() > new Date(user.email_verification_token_expires)) {
    throw new Error('Verification token expired');
  }

  // Update user as verified
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
    message: 'Email verified successfully! You now have full access to the platform.'
  };
}

/**
 * Resend verification email
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Success message
 * @throws {Error} If user not found or already verified
 */
export async function resendVerificationEmail(userId) {
  const pool = getPool();

  // Get user
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

  // Generate new verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const tokenExpires = new Date();
  tokenExpires.setHours(tokenExpires.getHours() + 24);

  // Update user with new token
  await pool.query(
    `UPDATE users 
     SET email_verification_token = $1, 
         email_verification_token_expires = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [verificationToken, tokenExpires, userId]
  );

  // Send verification email
  const emailSent = await sendVerificationEmail(user.email, user.name, verificationToken);

  if (!emailSent) {
    throw new Error('Failed to send verification email');
  }

  return {
    success: true,
    message: 'Verification email sent. Please check your inbox.'
  };
}
