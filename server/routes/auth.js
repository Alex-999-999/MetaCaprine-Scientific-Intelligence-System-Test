import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as authService from '../services/authService.js';
import { assignPlanToUser } from '../services/planService.js';
import { getPlanByName } from '../services/planService.js';
import { requireEmailVerification } from '../middleware/requireEmailVerification.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
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
      auth_user_id,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { user, token, email_sent } = await authService.registerUser({
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
      auth_user_id,
    });

    // Assign default free plan to new user
    try {
      const freePlan = await getPlanByName('free');
      await assignPlanToUser(user.id, freePlan.id);
    } catch (planError) {
      console.error('Failed to assign default plan:', planError);
      // Don't fail registration if plan assignment fails
    }

    res.status(201).json({
      user,
      token,
      email_sent,
      message: email_sent
        ? 'Registration successful. Please check your email to verify your account.'
        : 'Registration successful, but verification email could not be sent. Please use resend verification or contact support.'
    });
  } catch (error) {
    console.error('Register error:', error);

    const errorCode = error?.code;
    const errorMessage = typeof error === 'string' ? error : (error?.message || 'Internal server error');

    if (errorCode === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }

    if (errorMessage === 'Terms and conditions must be accepted') {
      return res.status(400).json({ error: errorMessage });
    }

    if (
      errorMessage === 'Country is required' ||
      errorMessage === 'City is required' ||
      errorMessage === 'Number of goats is required' ||
      errorMessage === 'Transforms products selection is required' ||
      errorMessage === 'Age is required' ||
      errorMessage === 'Sex is required' ||
      errorMessage === 'Sex must be one of: female, male, other, prefer_not_to_say'
    ) {
      return res.status(400).json({ error: errorMessage });
    }

    if (errorMessage.includes("Role 'free' not found")) {
      return res.status(500).json({
        error: 'RBAC setup is incomplete. Missing role: free. Run Hito 2 auth/RBAC migration and seed roles.'
      });
    }

    if (errorMessage.includes('JWT_SECRET not configured')) {
      return res.status(500).json({
        error: 'Server auth setup is incomplete. Set JWT_SECRET in environment variables.'
      });
    }

    if (errorCode === '42703') {
      return res.status(500).json({
        error: 'Database schema is outdated. Run the latest auth/profile migration in server/db.'
      });
    }

    res.status(500).json({ error: errorMessage });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Business logic in service layer
    const { user, token } = await authService.loginUser(email, password);

    res.json({
      user,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);

    // Handle specific error types
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (error.message === 'Email not verified') {
      return res.status(403).json({
        error: 'Email not verified',
        message: 'Please verify your email address before logging in.'
      });
    }

    if (error.code === 'ECONNREFUSED' || error.code === '28P01' || error.message?.includes('password authentication')) {
      return res.status(500).json({
        error: 'Database connection failed. Please check your database configuration.'
      });
    }

    const errorMessage = error.message || 'Internal server error';
    res.status(500).json({ error: errorMessage });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Business logic in service layer
    const user = await authService.getUserById(userId);

    res.json({ user });
  } catch (error) {
    console.error('Get user profile error:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    const errorMessage = error.message || 'Internal server error';
    res.status(500).json({ error: errorMessage });
  }
});

// Verify email
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    // Business logic in service layer
    const result = await authService.verifyEmail(token);

    res.json(result);
  } catch (error) {
    console.error('Email verification error:', error);

    if (error.message === 'Invalid verification token') {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    if (error.message === 'Email already verified') {
      return res.status(400).json({
        error: 'Email already verified',
        message: 'Your email has already been verified.'
      });
    }

    if (error.message === 'Verification token expired') {
      return res.status(400).json({
        error: 'Verification token expired',
        message: 'This verification link has expired. Please request a new one.'
      });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Public resend verification email (for users who cannot log in yet)
router.post('/resend-verification-public', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !String(email).trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await authService.resendVerificationEmailByEmail(email);
    res.json(result);
  } catch (error) {
    console.error('Public resend verification error:', error);
    if (error.message === 'Failed to send verification email') {
      return res.status(500).json({
        error: 'Failed to send verification email',
        message: 'Please try again later or contact support.',
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend verification email
router.post('/resend-verification', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Business logic in service layer
    const result = await authService.resendVerificationEmail(userId);

    res.json(result);
  } catch (error) {
    console.error('Resend verification error:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    if (error.message === 'Email already verified') {
      return res.status(400).json({
        error: 'Email already verified',
        message: 'Your email is already verified.'
      });
    }

    if (error.message === 'Failed to send verification email') {
      return res.status(500).json({
        error: 'Failed to send verification email',
        message: 'Please try again later or contact support.'
      });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await authService.requestPasswordReset(email);
    res.json(result);
  } catch (error) {
    console.error('Forgot password error:', error);
    const errorMessage = error.message || 'Internal server error';
    res.status(500).json({ error: errorMessage });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Reset token and password are required' });
    }

    const result = await authService.resetPassword(token, password);
    res.json(result);
  } catch (error) {
    console.error('Reset password error:', error);
    if (error.message === 'Invalid or expired password reset token') {
      return res.status(400).json({ error: error.message });
    }
    const errorMessage = error.message || 'Internal server error';
    res.status(500).json({ error: errorMessage });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await authService.updateUserProfile(userId, req.body || {});
    res.json({ user });
  } catch (error) {
    console.error('Update profile error:', error);
    const errorMessage = error.message || 'Internal server error';
    res.status(500).json({ error: errorMessage });
  }
});

// Update password from profile
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    const result = await authService.updateUserPassword(userId, currentPassword, newPassword);
    res.json(result);
  } catch (error) {
    console.error('Update password error:', error);
    if (error.message === 'Current password is incorrect') {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === 'User not found') {
      return res.status(404).json({ error: error.message });
    }
    const errorMessage = error.message || 'Internal server error';
    res.status(500).json({ error: errorMessage });
  }
});

// Legacy direct-upgrade endpoint disabled in favor of payment-backed billing flow.
router.post('/upgrade-to-pro', authenticateToken, requireEmailVerification, async (req, res) => {
  res.status(410).json({
    error: 'Direct self-upgrade is disabled. Start the billing checkout flow instead.',
  });
});

export default router;

