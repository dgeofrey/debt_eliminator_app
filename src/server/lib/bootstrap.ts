import { query, queryOne } from './db';
import { hashPassword } from './auth';

export async function bootstrapSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';

  if (!email || !password) {
    console.warn('[bootstrap] SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD not set - skipping super admin seed.');
    return;
  }

  // Retry DB connection a few times (compose may bring app up before DB is fully ready)
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const existing = await queryOne<{ id: string; is_super_admin: number }>(
        'SELECT id, is_super_admin FROM users WHERE email = ?',
        [email.toLowerCase()]
      );

      if (existing) {
        if (!existing.is_super_admin) {
          await query('UPDATE users SET is_super_admin = TRUE WHERE id = ?', [existing.id]);
          console.log(`[bootstrap] Promoted existing user "${email}" to super admin.`);
        } else {
          console.log(`[bootstrap] Super admin "${email}" already exists.`);
        }
        return;
      }

      const id = crypto.randomUUID();
      const passwordHash = await hashPassword(password);
      await query(
        `INSERT INTO users (id, email, password_hash, full_name, is_super_admin)
         VALUES (?, ?, ?, ?, TRUE)`,
        [id, email.toLowerCase(), passwordHash, name]
      );
      await query(
        `INSERT IGNORE INTO user_preferences (user_id, strategy) VALUES (?, 'avalanche')`,
        [id]
      );
      console.log(`[bootstrap] Created super admin: ${email}`);
      return;
    } catch (err: any) {
      if (attempt === 5) {
        console.error('[bootstrap] Failed to seed super admin:', err.message || err);
        return;
      }
      console.log(`[bootstrap] DB not ready (attempt ${attempt}/5), retrying...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}
