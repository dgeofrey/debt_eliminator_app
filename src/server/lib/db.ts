import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'debtuser',
  password: process.env.DB_PASSWORD || 'debtpass',
  database: process.env.DB_NAME || 'debt_eliminator',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  dateStrings: true,
});

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/**
 * MySQL doesn't support RETURNING. This helper:
 * 1. Generates a UUID
 * 2. Runs INSERT with that ID
 * 3. SELECTs the row back so we can return it
 */
export async function insertAndFetch<T = any>(
  table: string,
  data: Record<string, any>,
  selectColumns: string
): Promise<T | null> {
  const id = crypto.randomUUID();
  const row = { id, ...data };
  const keys = Object.keys(row);
  const placeholders = keys.map(() => '?').join(', ');
  const columnList = keys.join(', ');
  await pool.execute(
    `INSERT INTO ${table} (${columnList}) VALUES (${placeholders})`,
    Object.values(row)
  );
  return queryOne<T>(`SELECT ${selectColumns} FROM ${table} WHERE id = ?`, [id]);
}
