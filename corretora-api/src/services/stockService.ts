import db from '../config/database.js';
import logger from '../utils/logger.js';

const PROFESSOR_BASE = 'https://raw.githubusercontent.com/marciobarros/dsw-simulador-corretora/refs/heads/main';

export interface Ticker {
  ticker: string;
  fechamento: number;
}

export interface PrecoTicker {
  ticker: string;
  preco: number;
}

// Cache de tickers da API do professor
let tickersCache: Ticker[] | null = null;
let tickersCacheAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchTickers(): Promise<Ticker[]> {
  const now = Date.now();
  if (tickersCache && now - tickersCacheAt < CACHE_TTL_MS) return tickersCache;

  const url = `${PROFESSOR_BASE}/tickers.json`;
  logger.info(`Buscando tickers do professor: ${url}`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Falha ao buscar tickers: ${resp.status}`);

  tickersCache = (await resp.json()) as Ticker[];
  tickersCacheAt = now;
  return tickersCache;
}

export class StockService {
  /**
   * BUG #7 CORRIGIDO: lista ações usando IDs reais do banco (não IDs calculados).
   * O banco é a fonte de verdade dos IDs — a API do professor fornece apenas os preços.
   */
  static async getAll(limit = 50, offset = 0) {
    // Busca ações do banco (seed já populou)
    const rows = db.prepare(`
      SELECT id, symbol, closing_price FROM stocks ORDER BY symbol LIMIT ? OFFSET ?
    `).all(limit, offset) as any[];

    const countResult = db.prepare('SELECT COUNT(*) as count FROM stocks').get() as any;

    // Enriquece com preço de fechamento da API do professor (mais atualizado)
    let fechamentos: Record<string, number> = {};
    try {
      const tickers = await fetchTickers();
      for (const t of tickers) fechamentos[t.ticker] = t.fechamento;
    } catch (err) {
      logger.warn('Não foi possível buscar fechamentos da API do professor, usando banco local:', err);
    }

    return {
      stocks: rows.map(r => ({
        id: r.id,                            // ID real do banco
        symbol: r.symbol,
        name: r.symbol,
        closingPrice: fechamentos[r.symbol] ?? parseFloat(r.closing_price),
      })),
      total: countResult.count,
      limit,
      offset,
    };
  }

  /** Busca uma ação pelo símbolo — retorna ID real do banco */
  static async getBySymbol(symbol: string) {
    const stock = db.prepare(
      'SELECT id, symbol, closing_price FROM stocks WHERE symbol = ? COLLATE NOCASE'
    ).get(symbol) as any;
    if (!stock) throw new Error('Stock not found');

    let closingPrice = parseFloat(stock.closing_price);
    try {
      const tickers = await fetchTickers();
      const t = tickers.find(t => t.ticker.toUpperCase() === symbol.toUpperCase());
      if (t) closingPrice = t.fechamento;
    } catch { /* usa preço do banco */ }

    return { id: stock.id, symbol: stock.symbol, name: stock.symbol, closingPrice };
  }

  /** Busca ações por query no símbolo — retorna IDs reais do banco */
  static async search(query: string) {
    const rows = db.prepare(`
      SELECT id, symbol, closing_price FROM stocks
      WHERE symbol LIKE ? COLLATE NOCASE
      ORDER BY symbol LIMIT 20
    `).all(`%${query.toUpperCase()}%`) as any[];

    let fechamentos: Record<string, number> = {};
    try {
      const tickers = await fetchTickers();
      for (const t of tickers) fechamentos[t.ticker] = t.fechamento;
    } catch { /* usa banco */ }

    return rows.map(r => ({
      id: r.id,
      symbol: r.symbol,
      name: r.symbol,
      closingPrice: fechamentos[r.symbol] ?? parseFloat(r.closing_price),
    }));
  }

  /** Retorna os preços do pregão para um minuto específico (0–59) */
  static async getPricesByMinuto(minuto: number): Promise<PrecoTicker[]> {
    const url = `${PROFESSOR_BASE}/${minuto}.json`;
    logger.info(`Buscando preços do minuto ${minuto}: ${url}`);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Falha ao buscar preços do minuto ${minuto}: ${resp.status}`);
    return (await resp.json()) as PrecoTicker[];
  }

  /** Retorna o preço atual de um ticker em um minuto específico */
  static async getPriceBySymbolAndMinuto(symbol: string, minuto: number) {
    const precos = await StockService.getPricesByMinuto(minuto);
    const entry = precos.find(p => p.ticker.toUpperCase() === symbol.toUpperCase());
    if (!entry) throw new Error(`Ticker ${symbol} não encontrado no minuto ${minuto}`);
    return entry;
  }
}
