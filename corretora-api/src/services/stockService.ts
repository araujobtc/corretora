import db from '../config/database.js';
import { CreateStockInput, UpdateStockPriceInput } from '../schemas/index.js';
import logger from '../utils/logger.js';

export class StockService {
  static getAll(limit: number = 50, offset: number = 0) {
    try {
      const stocks = db.prepare(`
        SELECT id, symbol, name, current_price, created_at, updated_at
        FROM stocks
        LIMIT ? OFFSET ?
      `).all(limit, offset) as any[];

      const countResult = db.prepare('SELECT COUNT(*) as count FROM stocks').get() as any;

      return {
        stocks: stocks.map(s => ({
          id: s.id,
          symbol: s.symbol,
          name: s.name,
          currentPrice: parseFloat(s.current_price),
          createdAt: s.created_at,
          updatedAt: s.updated_at
        })),
        total: countResult.count,
        limit,
        offset
      };
    } catch (error) {
      logger.error('Erro ao obter ações:', error);
      throw error;
    }
  }

  static getById(stockId: number) {
    try {
      const stock = db.prepare(`
        SELECT id, symbol, name, current_price, created_at, updated_at
        FROM stocks WHERE id = ?
      `).get(stockId) as any;

      if (!stock) {
        throw new Error('Ação não encontrada');
      }

      return {
        id: stock.id,
        symbol: stock.symbol,
        name: stock.name,
        currentPrice: parseFloat(stock.current_price),
        createdAt: stock.created_at,
        updatedAt: stock.updated_at
      };
    } catch (error) {
      logger.error('Erro ao obter ação:', error);
      throw error;
    }
  }

  static getBySymbol(symbol: string) {
    try {
      const stock = db.prepare(`
        SELECT id, symbol, name, current_price, created_at, updated_at
        FROM stocks WHERE symbol = ?
      `).get(symbol) as any;

      if (!stock) {
        throw new Error('Ação não encontrada');
      }

      return {
        id: stock.id,
        symbol: stock.symbol,
        name: stock.name,
        currentPrice: parseFloat(stock.current_price),
        createdAt: stock.created_at,
        updatedAt: stock.updated_at
      };
    } catch (error) {
      logger.error('Erro ao obter ação pelo ticker:', error);
      throw error;
    }
  }

  static create(data: CreateStockInput) {
    try {
      const existingStock = db.prepare('SELECT id FROM stocks WHERE symbol = ?').get(data.symbol);
      if (existingStock) {
        throw new Error('Já existe uma ação com esse ticker');
      }

      const result = db.prepare(`
        INSERT INTO stocks (symbol, name, current_price)
        VALUES (?, ?, ?)
      `).run(data.symbol, data.name, data.currentPrice);

      return {
        id: result.lastInsertRowid as number,
        symbol: data.symbol,
        name: data.name,
        currentPrice: data.currentPrice
      };
    } catch (error) {
      logger.error('Erro ao criar ação:', error);
      throw error;
    }
  }

  static updatePrice(stockId: number, data: UpdateStockPriceInput) {
    try {
      const stock = db.prepare('SELECT id FROM stocks WHERE id = ?').get(stockId);
      if (!stock) {
        throw new Error('Ação não encontrada');
      }

      db.prepare(`
        UPDATE stocks SET current_price = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(data.currentPrice, stockId);

      return {
        id: stockId,
        currentPrice: data.currentPrice
      };
    } catch (error) {
      logger.error('Erro ao atualizar preço da ação:', error);
      throw error;
    }
  }

  static search(query: string) {
    try {
      const stocks = db.prepare(`
        SELECT id, symbol, name, current_price, created_at, updated_at
        FROM stocks
        WHERE symbol LIKE ? OR name LIKE ?
        LIMIT 20
      `).all(`%${query}%`, `%${query}%`) as any[];

      return stocks.map(s => ({
        id: s.id,
        symbol: s.symbol,
        name: s.name,
        currentPrice: parseFloat(s.current_price),
        createdAt: s.created_at,
        updatedAt: s.updated_at
      }));
    } catch (error) {
      logger.error('Erro ao buscar ações:', error);
      throw error;
    }
  }
}
