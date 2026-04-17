import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-03-25.dahlia',
});

export const STRIPE_PRO_PRICE_ID =
  process.env.STRIPE_PRO_PRICE_ID ?? 'price_1TNLXGR6vv0vv2hJC9OxLU3l';
