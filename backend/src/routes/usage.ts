import { Hono } from 'hono';
import { getTenantUsage } from '../lib/quota.js';

const app = new Hono();

app.get('/', async (c) => {
  const tenant = c.get('tenant');
  const usage = await getTenantUsage(tenant.id, tenant.plan, {
    unlimited: tenant.unlimited,
  });
  return c.json({ plan: tenant.plan, usage });
});

export default app;
