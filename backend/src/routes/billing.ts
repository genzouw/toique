import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import db from '../db.js';
import { tenants } from '../schema.js';
import { stripe, STRIPE_PRO_PRICE_ID } from '../lib/stripe.js';

const app = new Hono();

/**
 * POST /api/v1/billing/checkout
 * Stripe Checkout セッションを作成して URL を返す
 */
app.post('/checkout', async (c) => {
  const tenant = c.get('tenant');

  // 既にProプランの場合
  if (tenant.plan === 'pro') {
    return c.json({ error: '既に Pro プランです' }, 400);
  }

  // Stripe Customer を取得または作成
  const [t] = await db
    .select({
      stripeCustomerId: tenants.stripeCustomerId,
    })
    .from(tenants)
    .where(eq(tenants.id, tenant.id))
    .limit(1);

  let customerId = t?.stripeCustomerId;
  if (!customerId) {
    const authUser = c.get('authUser');
    const customer = await stripe.customers.create({
      email: authUser.email,
      metadata: { tenantId: tenant.id },
    });
    customerId = customer.id;
    await db
      .update(tenants)
      .set({ stripeCustomerId: customerId })
      .where(eq(tenants.id, tenant.id));
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: STRIPE_PRO_PRICE_ID, quantity: 1 }],
    success_url: `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/dashboard?upgraded=1`,
    cancel_url: `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/pricing`,
    metadata: { tenantId: tenant.id },
  });

  return c.json({ url: session.url });
});

/**
 * POST /api/v1/billing/portal
 * Stripe Customer Portal セッションを作成 (プラン管理・解約)
 */
app.post('/portal', async (c) => {
  const tenant = c.get('tenant');

  const [t] = await db
    .select({ stripeCustomerId: tenants.stripeCustomerId })
    .from(tenants)
    .where(eq(tenants.id, tenant.id))
    .limit(1);

  if (!t?.stripeCustomerId) {
    return c.json({ error: 'サブスクリプションが見つかりません' }, 400);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: t.stripeCustomerId,
    return_url: `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/dashboard`,
  });

  return c.json({ url: session.url });
});

export default app;
