import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import db from '../db.js';
import { submissions } from '../schema.js';

const app = new Hono();

app.get('/', async (c) => {
  const tenant = c.get('tenant');
  const rows = await db
    .select()
    .from(submissions)
    .where(eq(submissions.tenantId, tenant.id))
    .orderBy(desc(submissions.submittedAt))
    .limit(100);
  return c.json(rows);
});

export default app;
