import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from 'hono/bun';
import authRoutes from './routes/auth';
import financeRoutes from './routes/finance';
import chatRoutes from './routes/chat';
import { bootstrapSuperAdmin } from './lib/bootstrap';

const app = new Hono();

app.use('*', logger());
app.use('/api/*', cors({
  origin: ['http://localhost:5173', 'http://localhost:7070'],
  credentials: true,
}));

// API routes
app.route('/api/auth', authRoutes);
app.route('/api/finance', financeRoutes);
app.route('/api/chat', chatRoutes);

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Serve static client (production)
if (process.env.NODE_ENV === 'production') {
  app.use('/*', serveStatic({ root: './dist/client' }));
  app.get('*', serveStatic({ path: './dist/client/index.html' }));
}

const port = Number(process.env.PORT) || 7070;

// Bootstrap super admin on startup (idempotent)
bootstrapSuperAdmin().catch(err => console.error('[startup] bootstrap failed:', err));

console.log(`[server] listening on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
