import mysql from 'mysql2/promise';

const isProduction = process.env.NODE_ENV === 'production';

// Support both naming conventions:
// DB_HOST_PROD / DB_USER_PROD / DB_PASSWORD_PROD / DB_NAME_PROD  (our standard)
// HOSTINGER_HOST / HOSTINGER_USER / HOSTINGER_PASSWORD / HOSTINGER_DATABASE  (Hostinger style)
const dbConfig = {
  host: isProduction
    ? (process.env.DB_HOST_PROD || process.env.HOSTINGER_HOST || 'localhost')
    : (process.env.DB_HOST_DEV || 'localhost'),
  user: isProduction
    ? (process.env.DB_USER_PROD || process.env.HOSTINGER_USER || '')
    : (process.env.DB_USER_DEV || 'root'),
  password: isProduction
    ? (process.env.DB_PASSWORD_PROD || process.env.HOSTINGER_PASSWORD || '')
    : (process.env.DB_PASSWORD_DEV || ''),
  database: isProduction
    ? (process.env.DB_NAME_PROD || process.env.HOSTINGER_DATABASE || '')
    : (process.env.DB_NAME_DEV || ''),
  port: parseInt(
    isProduction
      ? (process.env.DB_PORT_PROD || process.env.HOSTINGER_PORT || '3306')
      : (process.env.DB_PORT_DEV || '3306')
  ),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

if (!isProduction) {
  console.log(`[DB] Development — ${dbConfig.database} @ ${dbConfig.host}`);
}

let pool: mysql.Pool | null = null;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

export async function query(sql: string, params?: any[]) {
  const pool = getPool();
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function getConnection() {
  const pool = getPool();
  return await pool.getConnection();
}
