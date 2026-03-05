import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as authService from '../services/authService.js';
import { assignPlanToUser } from '../services/planService.js';
import { getPlanByName } from '../services/planService.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Business logic in service layer
    const { user, token, email_sent } = await authService.registerUser(email, password, name);

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
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    const errorMessage = error.message || 'Internal server error';
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

export default router;
