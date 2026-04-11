import mysql from 'mysql2/promise';

// Detect environment
const isProduction = process.env.NODE_ENV === 'production';

// Database configuration based on environment
const dbConfig = {
  host: isProduction 
    ? (process.env.DB_HOST_PROD || 'localhost')
    : (process.env.DB_HOST_DEV || 'localhost'),
  user: isProduction 
    ? (process.env.DB_USER_PROD || '')
    : (process.env.DB_USER_DEV || 'root'),
  password: isProduction 
    ? (process.env.DB_PASSWORD_PROD || '')
    : (process.env.DB_PASSWORD_DEV || ''),
  database: isProduction 
    ? (process.env.DB_NAME_PROD || '')
    : (process.env.DB_NAME_DEV || 'sohelmalek_DB'),
  port: parseInt(isProduction 
    ? (process.env.DB_PORT_PROD || '3306')
    : (process.env.DB_PORT_DEV || '3306')),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

console.log(`Running in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
console.log(`Connecting to database: ${dbConfig.database} @ ${dbConfig.host}`);

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