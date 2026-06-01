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

  tickersCache = (await resp.json()) as Ticker[];
  tickersCacheAt = now;
  return tickersCache;
}

export class StockService {
  /** Lista todas as ações com preço de fechamento (da API do professor) */
  static async getAll(limit = 50, offset = 0) {
    const tickers = await fetchTickers();
    const slice = tickers.slice(offset, offset + limit);
    return {
      stocks: slice.map((t, i) => ({
        id: offset + i + 1,
        symbol: t.ticker,
        name: t.ticker,
        closingPrice: t.fechamento,
      })),
      total: tickers.length,
      limit,
      offset,
    };
  }

  /** Busca uma ação pelo símbolo (ticker) */
  static async getBySymbol(symbol: string) {
    const tickers = await fetchTickers();
    const ticker = tickers.find(t => t.ticker.toUpperCase() === symbol.toUpperCase());
    if (!ticker) throw new Error('Stock not found');
    return {
      symbol: ticker.ticker,
      name: ticker.ticker,
      closingPrice: ticker.fechamento,
    };
  }

  /** Busca ações por query no símbolo */
  static async search(query: string) {
    const tickers = await fetchTickers();
    const q = query.toUpperCase();
    return tickers
      .filter(t => t.ticker.includes(q))
      .slice(0, 20)
      .map(t => ({
        symbol: t.ticker,
        name: t.ticker,
        closingPrice: t.fechamento,
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
