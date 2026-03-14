import Stripe from 'stripe';
import { getPool } from '../db/pool.js';
import { getPlanByName } from './planService.js';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY?.trim();
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET?.trim();
const STRIPE_PRICE_PRO_MONTHLY = process.env.STRIPE_PRICE_PRO_MONTHLY?.trim();
const APP_URL =
  process.env.APP_URL?.trim() ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

let stripeClient = null;

function getStripeClient() {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('Billing is not configured. Missing STRIPE_SECRET_KEY.');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(STRIPE_SECRET_KEY);
  }

  return stripeClient;
}

async function getUserRecord(userId) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT
       u.id,
       u.email,
       u.name,
       u.stripe_customer_id,
       up.status AS plan_status,
       p.name AS plan_name,
       up.external_subscription_id,
       up.current_period_end,
       up.cancel_at_period_end
     FROM users u
     LEFT JOIN user_plans up ON up.user_id = u.id
     LEFT JOIN plans p ON p.id = up.plan_id
     WHERE u.id = $1
     LIMIT 1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  return result.rows[0];
}

async function resolvePaidPlan() {
  try {
    return await getPlanByName('pro');
  } catch (_) {
    return getPlanByName('premium');
  }
}

async function resolveFreePlan() {
  return getPlanByName('free');
}

async function ensureStripeCustomer(user) {
  const stripe = getStripeClient();
  const pool = getPool();

  if (user.stripe_customer_id) {
    return user.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name || user.email,
    metadata: {
      app_user_id: String(user.id),
    },
  });

  await pool.query(
    `UPDATE users
     SET stripe_customer_id = $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [customer.id, user.id]
  );

  return customer.id;
}

async function setUserRoleForPaidAccess(client, userId, hasPaidAccess) {
  const currentRoleResult = await client.query(
    `SELECT r.name
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = $1
     LIMIT 1`,
    [userId]
  );

  if (currentRoleResult.rows[0]?.name === 'admin') {
    return;
  }

  const targetRoleName = hasPaidAccess ? 'pro' : 'free';
  const roleResult = await client.query(
    'SELECT id FROM roles WHERE name = $1 LIMIT 1',
    [targetRoleName]
  );

  if (roleResult.rows.length === 0) {
    throw new Error(`Role '${targetRoleName}' not found`);
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

function normalizeSubscriptionStatus(status) {
  const normalized = String(status || '').toLowerCase();
  if (!normalized) return 'inactive';
  return normalized;
}

function grantsPaidAccess(status) {
  return ['active', 'trialing'].includes(normalizeSubscriptionStatus(status));
}

function toDateOrNull(unixSeconds) {
  if (!unixSeconds) return null;
  return new Date(Number(unixSeconds) * 1000);
}

async function upsertBillingPlanRecord(client, payload) {
  const {
    userId,
    planId,
    status,
    customerId,
    subscriptionId,
    priceId,
    currentPeriodEnd,
    cancelAtPeriodEnd,
  } = payload;

  await client.query(
    `INSERT INTO user_plans (
       user_id,
       plan_id,
       status,
       started_at,
       billing_provider,
       external_customer_id,
       external_subscription_id,
       external_price_id,
       current_period_end,
       cancel_at_period_end,
       updated_at
     ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'stripe', $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id) DO UPDATE SET
       plan_id = EXCLUDED.plan_id,
       status = EXCLUDED.status,
       billing_provider = EXCLUDED.billing_provider,
       external_customer_id = EXCLUDED.external_customer_id,
       external_subscription_id = EXCLUDED.external_subscription_id,
       external_price_id = EXCLUDED.external_price_id,
       current_period_end = EXCLUDED.current_period_end,
       cancel_at_period_end = EXCLUDED.cancel_at_period_end,
       updated_at = CURRENT_TIMESTAMP`,
    [
      userId,
      planId,
      status,
      customerId,
      subscriptionId,
      priceId,
      currentPeriodEnd,
      cancelAtPeriodEnd,
    ]
  );
}

async function syncStripeSubscription(subscription) {
  const pool = getPool();
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;
  const metadataUserId = Number.parseInt(subscription.metadata?.app_user_id || '', 10);
  const lookup = await pool.query(
    `SELECT id, stripe_customer_id
     FROM users
     WHERE ($1::text IS NOT NULL AND stripe_customer_id = $1)
        OR ($2::int IS NOT NULL AND id = $2)
     ORDER BY CASE WHEN stripe_customer_id = $1 THEN 0 ELSE 1 END
     LIMIT 1`,
    [customerId || null, Number.isNaN(metadataUserId) ? null : metadataUserId]
  );

  if (lookup.rows.length === 0) {
    return { applied: false, reason: 'user_not_found' };
  }

  const userId = lookup.rows[0].id;
  const subscriptionStatus = normalizeSubscriptionStatus(subscription.status);
  const hasPaidAccess = grantsPaidAccess(subscriptionStatus);
  const targetPlan = hasPaidAccess ? await resolvePaidPlan() : await resolveFreePlan();
  const priceId = subscription.items?.data?.[0]?.price?.id || null;
  const currentPeriodEndUnix = subscription.items?.data?.[0]?.current_period_end || subscription.current_period_end || null;
  const currentPeriodEnd = toDateOrNull(currentPeriodEndUnix);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (customerId && customerId !== lookup.rows[0].stripe_customer_id) {
      await client.query(
        `UPDATE users
         SET stripe_customer_id = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [customerId, userId]
      );
    }

    await upsertBillingPlanRecord(client, {
      userId,
      planId: targetPlan.id,
      status: hasPaidAccess ? 'active' : subscriptionStatus,
      customerId,
      subscriptionId: subscription.id,
      priceId,
      currentPeriodEnd,
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    });

    await setUserRoleForPaidAccess(client, userId, hasPaidAccess);
    await client.query('COMMIT');
    return { applied: true, userId, hasPaidAccess, status: subscriptionStatus };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getBillingStatus(userId) {
  const user = await getUserRecord(userId);
  return {
    configured: Boolean(STRIPE_SECRET_KEY),
    checkout_ready: Boolean(STRIPE_SECRET_KEY && STRIPE_PRICE_PRO_MONTHLY),
    provider: 'stripe',
    plan_name: user.plan_name || 'free',
    plan_status: user.plan_status || 'active',
    has_paid_access: ['pro', 'premium'].includes(String(user.plan_name || '').toLowerCase()) && grantsPaidAccess(user.plan_status || 'active'),
    can_manage_billing: Boolean(user.stripe_customer_id),
    current_period_end: user.current_period_end || null,
    cancel_at_period_end: Boolean(user.cancel_at_period_end),
  };
}

export async function createCheckoutSessionForUser(userId, options = {}) {
  if (!STRIPE_PRICE_PRO_MONTHLY) {
    throw new Error('Billing is not configured. Missing STRIPE_PRICE_PRO_MONTHLY.');
  }

  const stripe = getStripeClient();
  const user = await getUserRecord(userId);
  const customerId = await ensureStripeCustomer(user);
  const paidPlan = await resolvePaidPlan();
  const successUrl = options.successUrl || `${APP_URL}/profile?billing=success`;
  const cancelUrl = options.cancelUrl || `${APP_URL}/profile?billing=cancelled`;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: String(user.id),
    allow_promotion_codes: true,
    line_items: [
      {
        price: STRIPE_PRICE_PRO_MONTHLY,
        quantity: 1,
      },
    ],
    metadata: {
      app_user_id: String(user.id),
      app_plan_name: paidPlan.name,
    },
    subscription_data: {
      metadata: {
        app_user_id: String(user.id),
        app_plan_name: paidPlan.name,
      },
    },
  });

  if (!session.url) {
    throw new Error('Could not create checkout session');
  }

  return {
    url: session.url,
    session_id: session.id,
  };
}

export async function createBillingPortalSessionForUser(userId, options = {}) {
  const stripe = getStripeClient();
  const user = await getUserRecord(userId);
  const customerId = await ensureStripeCustomer(user);
  const returnUrl = options.returnUrl || `${APP_URL}/profile`;

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return {
    url: session.url,
  };
}

export function constructStripeEvent(payload, signature) {
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error('Billing is not configured. Missing STRIPE_WEBHOOK_SECRET.');
  }

  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
}

async function fetchSubscriptionFromEvent(event) {
  const stripe = getStripeClient();

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (session.mode !== 'subscription' || !session.subscription) {
      return null;
    }
    return stripe.subscriptions.retrieve(session.subscription);
  }

  if (event.type.startsWith('customer.subscription.')) {
    return event.data.object;
  }

  if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    if (!invoice.subscription) {
      return null;
    }
    return stripe.subscriptions.retrieve(invoice.subscription);
  }

  return null;
}

export async function processStripeWebhookEvent(event) {
  const subscription = await fetchSubscriptionFromEvent(event);
  if (!subscription) {
    return { handled: false, reason: 'event_ignored' };
  }

  const syncResult = await syncStripeSubscription(subscription);
  return { handled: true, syncResult };
}

