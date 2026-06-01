import logger from '../utils/logger.js';

const PROFESSOR_BASE = 'https://raw.githubusercontent.com/marciobarros/dsw-simulador-corretora/refs/heads/main';


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

export interface Ticker {
  ticker: string;
  fechamento: number;
}

export interface PrecoTicker {
  ticker: string;
  preco: number;
}


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

// Cache simples em memória para não bater na API do professor a cada request
let tickersCache: Ticker[] | null = null;
let tickersCacheAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

async function fetchTickers(): Promise<Ticker[]> {
  const now = Date.now();
  if (tickersCache && now - tickersCacheAt < CACHE_TTL_MS) {
    return tickersCache;
  }

  const url = `${PROFESSOR_BASE}/tickers.json`;
  logger.info(`Buscando tickers do professor: ${url}`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Falha ao buscar tickers: ${resp.status}`);

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

  /** Retorna os preços do pregão para um minuto específico (0–59) */
  static async getPricesByMinuto(minuto: number): Promise<PrecoTicker[]> {
    const url = `${PROFESSOR_BASE}/${minuto}.json`;
    logger.info(`Buscando preços do minuto ${minuto}: ${url}`);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Falha ao buscar preços do minuto ${minuto}: ${resp.status}`);
    return (await resp.json()) as PrecoTicker[];
  }

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

  /** Retorna o preço atual de um ticker em um minuto específico */
  static async getPriceBySymbolAndMinuto(symbol: string, minuto: number) {
    const precos = await StockService.getPricesByMinuto(minuto);
    const entry = precos.find(p => p.ticker.toUpperCase() === symbol.toUpperCase());
    if (!entry) throw new Error(`Ticker ${symbol} não encontrado no minuto ${minuto}`);
    return entry;
  }
}
