import { Pool, PoolClient } from 'pg';
import logger from '../utils/logger.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL não definida. Configure a string de conexão do PostgreSQL (ex: postgresql://user:senha@host:5432/banco).'
  );
}

export const pool = new Pool({
  connectionString,
  // Render e a maioria dos provedores de Postgres gerenciado exigem SSL em produção,
  // mas usam certificado autoassinado — por isso desabilitamos a validação da CA.
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  logger.error('Erro inesperado em uma conexão ociosa do pool do PostgreSQL:', err);
});

/** Executa uma query simples usando uma conexão do pool. */
export async function dbQuery(text: string, params: any[] = []) {
  return pool.query(text, params);
}

/**
 * Executa uma série de operações dentro de uma transação.
 * Faz commit automático se `fn` resolver com sucesso, ou rollback se lançar erro.
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        balance NUMERIC(14,2) NOT NULL DEFAULT 0.00,
        clock_minute INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS stocks (
        id SERIAL PRIMARY KEY,
        symbol TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        current_price NUMERIC(14,2) NOT NULL DEFAULT 0,
        closing_price NUMERIC(14,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS portfolio (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        stock_id INTEGER NOT NULL REFERENCES stocks(id),
        quantity INTEGER NOT NULL DEFAULT 0,
        average_price NUMERIC(14,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, stock_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        stock_id INTEGER NOT NULL REFERENCES stocks(id),
        type TEXT NOT NULL CHECK(type IN ('BUY', 'SELL')),
        quantity INTEGER NOT NULL,
        price NUMERIC(14,2) NOT NULL,
        limit_price NUMERIC(14,2),
        total NUMERIC(14,2) NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'EXECUTED' CHECK(status IN ('PENDING', 'EXECUTED', 'CANCELLED')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type TEXT NOT NULL CHECK(type IN ('DEPOSIT', 'WITHDRAW', 'BUY', 'SELL')),
        amount NUMERIC(14,2) NOT NULL,
        description TEXT,
        balance_after NUMERIC(14,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS watchlist (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        stock_id INTEGER NOT NULL REFERENCES stocks(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, stock_id)
      )
    `);

    // Tabela para tokens de reset de senha
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migrações para bancos já existentes (idempotentes — Postgres 9.6+ suporta IF NOT EXISTS em ADD COLUMN)
    await pool.query(`ALTER TABLE stocks ADD COLUMN IF NOT EXISTS closing_price NUMERIC(14,2) NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS clock_minute INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS balance_after NUMERIC(14,2)`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS limit_price NUMERIC(14,2)`);

    logger.info('Banco de dados (PostgreSQL) inicializado com sucesso');
  } catch (error) {
    logger.error('Falha ao inicializar banco de dados:', error);
    throw error;
  }
}

export default pool;
