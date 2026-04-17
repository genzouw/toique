import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import db from '../../db.js';
import { tenants } from '../../schema.js';
import { stripe } from '../../lib/stripe.js';
import type Stripe from 'stripe';

const app = new Hono();

/**
 * POST /webhooks/stripe
 * Stripe Webhook イベントを処理
 */
app.post('/', async (c) => {
  const sig = c.req.header('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return c.text('Missing signature or webhook secret', 400);
  }

  const rawBody = await c.req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch {
    return c.text('Invalid signature', 400);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const tenantId = session.metadata?.tenantId;
      if (tenantId && session.subscription) {
        await db
          .update(tenants)
          .set({
            plan: 'pro',
            stripeSubscriptionId: session.subscription as string,
          })
          .where(eq(tenants.id, tenantId));
        console.log(`Tenant ${tenantId} upgraded to pro`);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      // サブスクリプション解約 → free に戻す
      const [t] = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.stripeSubscriptionId, subscription.id))
        .limit(1);
      if (t) {
        await db
          .update(tenants)
          .set({
            plan: 'free',
            stripeSubscriptionId: null,
          })
          .where(eq(tenants.id, t.id));
        console.log(`Tenant ${t.id} downgraded to free`);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      // ステータスが active でなくなった場合 (支払い失敗等)
      if (subscription.status !== 'active') {
        const [t] = await db
          .select({ id: tenants.id })
          .from(tenants)
          .where(eq(tenants.stripeSubscriptionId, subscription.id))
          .limit(1);
        if (t && subscription.status === 'canceled') {
          await db
            .update(tenants)
            .set({ plan: 'free', stripeSubscriptionId: null })
            .where(eq(tenants.id, t.id));
        }
      }
      break;
    }
  }

  return c.json({ received: true });
});

export default app;
