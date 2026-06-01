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

let tickersCache: Ticker[] | null = null;
let tickersCacheAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchTickers(): Promise<Ticker[]> {
  const now = Date.now();

  if (tickersCache && now - tickersCacheAt < CACHE_TTL_MS) {
    return tickersCache;
  }

  const url = `${PROFESSOR_BASE}/tickers.json`;
  const resp = await fetch(url);

  if (!resp.ok) {
    throw new Error(`Falha ao buscar tickers: ${resp.status}`);
  }

  tickersCache = (await resp.json()) as Ticker[];
  tickersCacheAt = now;

  return tickersCache;
}

export class StockService {
  static async getAll(limit = 50, offset = 0) {
    const tickers = await fetchTickers();

    return {
      stocks: tickers.slice(offset, offset + limit).map((t, i) => ({
        id: offset + i + 1,
        symbol: t.ticker,
        name: t.ticker,
        closingPrice: t.fechamento
      })),
      total: tickers.length,
      limit,
      offset
    };
  }

  static async getBySymbol(symbol: string) {
    const tickers = await fetchTickers();

    const ticker = tickers.find(
      t => t.ticker.toUpperCase() === symbol.toUpperCase()
    );

    if (!ticker) {
      throw new Error('Stock not found');
    }

    return {
      symbol: ticker.ticker,
      name: ticker.ticker,
      closingPrice: ticker.fechamento
    };
  }

  static async search(query: string) {
    const tickers = await fetchTickers();
    const q = query.toUpperCase();

    return tickers
      .filter(t => t.ticker.includes(q))
      .slice(0, 20)
      .map(t => ({
        symbol: t.ticker,
        name: t.ticker,
        closingPrice: t.fechamento
      }));
  }

  static async getPricesByMinuto(minuto: number): Promise<PrecoTicker[]> {
    const url = `${PROFESSOR_BASE}/${minuto}.json`;

    logger.info(`Buscando preços do minuto ${minuto}: ${url}`);

    const resp = await fetch(url);

    if (!resp.ok) {
      throw new Error(`Falha ao buscar preços do minuto ${minuto}`);
    }

    return (await resp.json()) as PrecoTicker[];
  }

  static async getPriceBySymbolAndMinuto(symbol: string, minuto: number): Promise<PrecoTicker> {
    const precos = await this.getPricesByMinuto(minuto);

    const preco = precos.find(
      p => p.ticker.toUpperCase() === symbol.toUpperCase()
    );

    if (!preco) {
      throw new Error('Preço não encontrado');
    }

    return preco;
  }
}
