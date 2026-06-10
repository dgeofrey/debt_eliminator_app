import { Hono } from 'hono';
import { query, queryOne } from '../lib/db';
import { hashPassword, verifyPassword, signToken } from '../lib/auth';
import { requireAuth } from '../middleware/auth';

const auth = new Hono();

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  is_super_admin?: number;
}

// ===== REGISTER =====
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, fullName } = body;

    if (!email || !password) return c.json({ error: 'Email and password required' }, 400);
    if (password.length < 8) return c.json({ error: 'Password must be at least 8 characters' }, 400);

    const existing = await queryOne<UserRow>('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing) return c.json({ error: 'Email already registered' }, 409);

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    await query(
      `INSERT INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)`,
      [id, email.toLowerCase(), passwordHash, fullName || null]
    );
    await query(
      `INSERT IGNORE INTO user_preferences (user_id, strategy) VALUES (?, 'avalanche')`,
      [id]
    );

    const token = signToken({ userId: id, email: email.toLowerCase() });
    return c.json({
      token,
      user: { id, email: email.toLowerCase(), fullName: fullName || null, isSuperAdmin: false },
    }, 201);
  } catch (err) {
    console.error('[auth/register]', err);
    return c.json({ error: 'Internal error' }, 500);
  }
});

// ===== LOGIN =====
auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) return c.json({ error: 'Email and password required' }, 400);

    const user = await queryOne<UserRow>(
      'SELECT id, email, password_hash, full_name, is_super_admin FROM users WHERE email = ?',
      [email.toLowerCase()]
    );
    if (!user) return c.json({ error: 'Invalid credentials' }, 401);

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return c.json({ error: 'Invalid credentials' }, 401);

    await query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    const token = signToken({ userId: user.id, email: user.email });
    return c.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        isSuperAdmin: !!user.is_super_admin,
      },
    });
  } catch (err) {
    console.error('[auth/login]', err);
    return c.json({ error: 'Internal error' }, 500);
  }
});

// ===== CURRENT USER =====
auth.get('/me', requireAuth, async (c) => {
  const userId = c.get('userId') as string;
  const user = await queryOne<UserRow>(
    'SELECT id, email, full_name, is_super_admin FROM users WHERE id = ?',
    [userId]
  );
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json({
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    isSuperAdmin: !!user.is_super_admin,
  });
});

export default auth;
