import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireEmailVerification } from '../middleware/requireEmailVerification.js';
import {
  constructStripeEvent,
  createBillingPortalSessionForUser,
  createCheckoutSessionForUser,
  getBillingStatus,
  processStripeWebhookEvent,
} from '../services/billingService.js';

const router = express.Router();

export async function handleStripeWebhook(req, res) {
  try {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing Stripe signature' });
    }

    const event = constructStripeEvent(req.body, signature);
    const result = await processStripeWebhookEvent(event);
    return res.json({ received: true, ...result });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return res.status(400).json({ error: error.message || 'Webhook processing failed' });
  }
}

router.use(authenticateToken);
router.use(requireEmailVerification);

router.get('/status', async (req, res) => {
  try {
    const status = await getBillingStatus(req.user.userId);
    res.json(status);
  } catch (error) {
    console.error('Get billing status error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.post('/create-checkout-session', async (req, res) => {
  try {
    const session = await createCheckoutSessionForUser(req.user.userId, req.body || {});
    res.json({ success: true, ...session });
  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({ error: error.message || 'Could not start checkout' });
  }
});

router.post('/create-portal-session', async (req, res) => {
  try {
    const session = await createBillingPortalSessionForUser(req.user.userId, req.body || {});
    res.json({ success: true, ...session });
  } catch (error) {
    console.error('Create billing portal session error:', error);
    res.status(500).json({ error: error.message || 'Could not open billing portal' });
  }
});

export default router;
