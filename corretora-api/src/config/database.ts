import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Diretório persistente do Render
const dataDir =
  process.env.NODE_ENV === 'production'
    ? '/opt/render/project/src/data'
    : path.join(__dirname, '../../data');

// Cria pasta se não existir
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.db');

const db = new Database(dbPath);

export default db;

db.pragma('journal_mode = WAL');

// Enable foreign keys
db.pragma('foreign_keys = ON');

export function initializeDatabase() {
  try {
    // Create users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        balance REAL NOT NULL DEFAULT 0.00,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create stocks table
    db.exec(`
      CREATE TABLE IF NOT EXISTS stocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        current_price REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create portfolio table
    db.exec(`
      CREATE TABLE IF NOT EXISTS portfolio (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        stock_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        average_price REAL NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (stock_id) REFERENCES stocks(id),
        UNIQUE(user_id, stock_id)
      )
    `);

    // Create orders table
    db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        stock_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('BUY', 'SELL')),
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        total REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'EXECUTED' CHECK(status IN ('PENDING', 'EXECUTED', 'CANCELLED')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (stock_id) REFERENCES stocks(id)
      )
    `);

    // Create transactions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('DEPOSIT', 'WITHDRAW', 'BUY', 'SELL')),
        amount REAL NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Create watchlist table
    db.exec(`
      CREATE TABLE IF NOT EXISTS watchlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        stock_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (stock_id) REFERENCES stocks(id),
        UNIQUE(user_id, stock_id)
      )
    `);

    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

