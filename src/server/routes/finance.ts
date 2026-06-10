import { Hono } from 'hono';
import { query, queryOne, insertAndFetch } from '../lib/db';
import { requireAuth } from '../middleware/auth';

const finance = new Hono();
finance.use('*', requireAuth);

// ============================================================
// GET FULL STATE
// ============================================================
finance.get('/state', async (c) => {
  const userId = c.get('userId') as string;
  const [incomes, expenses, debts, prefs] = await Promise.all([
    query('SELECT id, source, amount FROM incomes WHERE user_id = ? ORDER BY created_at', [userId]),
    query('SELECT id, name, amount FROM expenses WHERE user_id = ? ORDER BY created_at', [userId]),
    query('SELECT id, name, balance, apr, min_payment AS minPayment FROM debts WHERE user_id = ? ORDER BY created_at', [userId]),
    queryOne<{ strategy: string; theme: string }>('SELECT strategy, theme FROM user_preferences WHERE user_id = ?', [userId]),
  ]);
  return c.json({
    incomes,
    expenses,
    debts,
    strategy: prefs?.strategy || 'avalanche',
    theme: prefs?.theme || 'dark',
  });
});

// ============================================================
// INCOMES
// ============================================================
finance.post('/incomes', async (c) => {
  const userId = c.get('userId') as string;
  const { source, amount } = await c.req.json();
  const row = await insertAndFetch(
    'incomes',
    { user_id: userId, source: source || '', amount: amount || 0 },
    'id, source, amount'
  );
  return c.json(row, 201);
});

finance.patch('/incomes/:id', async (c) => {
  const userId = c.get('userId') as string;
  const id = c.req.param('id');
  const body = await c.req.json();
  const sets: string[] = [];
  const params: any[] = [];
  if (body.source !== undefined) { sets.push('source = ?'); params.push(body.source); }
  if (body.amount !== undefined) { sets.push('amount = ?'); params.push(body.amount); }
  if (sets.length === 0) return c.json({ error: 'No fields' }, 400);
  params.push(id, userId);
  await query(`UPDATE incomes SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`, params);
  const row = await queryOne('SELECT id, source, amount FROM incomes WHERE id = ? AND user_id = ?', [id, userId]);
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

finance.delete('/incomes/:id', async (c) => {
  const userId = c.get('userId') as string;
  await query('DELETE FROM incomes WHERE id = ? AND user_id = ?', [c.req.param('id'), userId]);
  return c.json({ ok: true });
});

// ============================================================
// EXPENSES
// ============================================================
finance.post('/expenses', async (c) => {
  const userId = c.get('userId') as string;
  const { name, amount } = await c.req.json();
  const row = await insertAndFetch(
    'expenses',
    { user_id: userId, name: name || '', amount: amount || 0 },
    'id, name, amount'
  );
  return c.json(row, 201);
});

finance.patch('/expenses/:id', async (c) => {
  const userId = c.get('userId') as string;
  const id = c.req.param('id');
  const body = await c.req.json();
  const sets: string[] = [];
  const params: any[] = [];
  if (body.name !== undefined) { sets.push('name = ?'); params.push(body.name); }
  if (body.amount !== undefined) { sets.push('amount = ?'); params.push(body.amount); }
  if (sets.length === 0) return c.json({ error: 'No fields' }, 400);
  params.push(id, userId);
  await query(`UPDATE expenses SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`, params);
  const row = await queryOne('SELECT id, name, amount FROM expenses WHERE id = ? AND user_id = ?', [id, userId]);
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

finance.delete('/expenses/:id', async (c) => {
  const userId = c.get('userId') as string;
  await query('DELETE FROM expenses WHERE id = ? AND user_id = ?', [c.req.param('id'), userId]);
  return c.json({ ok: true });
});

// ============================================================
// DEBTS
// ============================================================
finance.post('/debts', async (c) => {
  const userId = c.get('userId') as string;
  const { name, balance, apr, minPayment } = await c.req.json();
  const row = await insertAndFetch(
    'debts',
    {
      user_id: userId,
      name: name || '',
      balance: balance || 0,
      apr: apr || 0,
      min_payment: minPayment || 0,
    },
    'id, name, balance, apr, min_payment AS minPayment'
  );
  return c.json(row, 201);
});

finance.patch('/debts/:id', async (c) => {
  const userId = c.get('userId') as string;
  const id = c.req.param('id');
  const body = await c.req.json();
  const sets: string[] = [];
  const params: any[] = [];
  if (body.name !== undefined) { sets.push('name = ?'); params.push(body.name); }
  if (body.balance !== undefined) { sets.push('balance = ?'); params.push(body.balance); }
  if (body.apr !== undefined) { sets.push('apr = ?'); params.push(body.apr); }
  if (body.minPayment !== undefined) { sets.push('min_payment = ?'); params.push(body.minPayment); }
  if (sets.length === 0) return c.json({ error: 'No fields' }, 400);
  params.push(id, userId);
  await query(`UPDATE debts SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`, params);
  const row = await queryOne(
    'SELECT id, name, balance, apr, min_payment AS minPayment FROM debts WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

finance.delete('/debts/:id', async (c) => {
  const userId = c.get('userId') as string;
  await query('DELETE FROM debts WHERE id = ? AND user_id = ?', [c.req.param('id'), userId]);
  return c.json({ ok: true });
});

// ============================================================
// PREFERENCES
// ============================================================
finance.put('/preferences', async (c) => {
  const userId = c.get('userId') as string;
  const body = await c.req.json();
  const sets: string[] = [];
  const params: any[] = [];
  if (body.strategy) {
    if (!['avalanche', 'snowball'].includes(body.strategy)) return c.json({ error: 'Invalid strategy' }, 400);
    sets.push('strategy = ?'); params.push(body.strategy);
  }
  if (body.theme) {
    if (!['dark', 'light'].includes(body.theme)) return c.json({ error: 'Invalid theme' }, 400);
    sets.push('theme = ?'); params.push(body.theme);
  }
  if (sets.length === 0) return c.json({ error: 'No fields' }, 400);

  // Upsert
  const existing = await queryOne('SELECT user_id FROM user_preferences WHERE user_id = ?', [userId]);
  if (existing) {
    params.push(userId);
    await query(`UPDATE user_preferences SET ${sets.join(', ')} WHERE user_id = ?`, params);
  } else {
    const cols = ['user_id', ...(body.strategy ? ['strategy'] : []), ...(body.theme ? ['theme'] : [])];
    const vals = [userId, ...(body.strategy ? [body.strategy] : []), ...(body.theme ? [body.theme] : [])];
    await query(
      `INSERT INTO user_preferences (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      vals
    );
  }
  return c.json({ ok: true });
});

// ============================================================
// SEED DEFAULTS
// ============================================================
finance.post('/seed-defaults', async (c) => {
  const userId = c.get('userId') as string;
  const existing = await queryOne('SELECT id FROM debts WHERE user_id = ? LIMIT 1', [userId]);
  if (existing) return c.json({ message: 'Already has data' });

  const inserts = [
    ['incomes', { source: 'Primary Salary', amount: 5500 }],
    ['incomes', { source: 'Side Hustle', amount: 800 }],
    ['expenses', { name: 'Rent / Mortgage', amount: 1800 }],
    ['expenses', { name: 'Utilities', amount: 220 }],
    ['expenses', { name: 'Groceries', amount: 600 }],
    ['expenses', { name: 'Transportation', amount: 300 }],
  ];
  for (const [table, data] of inserts) {
    const id = crypto.randomUUID();
    const cols = ['id', 'user_id', ...Object.keys(data as object)];
    const vals = [id, userId, ...Object.values(data as object)];
    await query(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      vals
    );
  }
  const debts = [
    { name: 'Credit Card A', balance: 3500, apr: 24.99, min_payment: 105 },
    { name: 'Credit Card B', balance: 1200, apr: 19.99, min_payment: 40 },
    { name: 'Car Loan', balance: 12000, apr: 6.5, min_payment: 385 },
    { name: 'Student Loan', balance: 18000, apr: 5.8, min_payment: 220 },
  ];
  for (const d of debts) {
    const id = crypto.randomUUID();
    await query(
      'INSERT INTO debts (id, user_id, name, balance, apr, min_payment) VALUES (?, ?, ?, ?, ?, ?)',
      [id, userId, d.name, d.balance, d.apr, d.min_payment]
    );
  }
  return c.json({ message: 'Defaults seeded' });
});

export default finance;
