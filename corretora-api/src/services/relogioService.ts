import { dbQuery, withTransaction } from '../config/database.js';
import { StockService, PrecoTicker } from './stockService.js';
import logger from '../utils/logger.js';

export class RelogioServico {

  /**
   * Avança o relógio do usuário em N minutos.
   * Busca os preços daquele minuto diretamente na API do professor (ponte pura)
   * e processa ordens pendentes do usuário contra esses preços.
   * NÃO grava preços no banco de ações — apenas lê e opera.
   */
  static async avancar(userId: number, minutos: number): Promise<{
    minutoAnterior: number;
    novoMinuto: number;
    horaFormatada: string;
    precosConsultados: number;
    ordenasExecutadas: number[];
  }> {
    const userResult = await dbQuery('SELECT clock_minute FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    if (!user) throw new Error('Usuário não encontrado');

    const minutoAnterior: number = user.clock_minute ?? 0;
    const novoMinuto = (minutoAnterior + minutos) % 60;

    // Busca preços diretamente da API do professor (ponte pura, sem gravar no banco)
    const precos = await StockService.getPricesByMinuto(novoMinuto);
    const precoMap: Record<string, number> = {};
    for (const p of precos) precoMap[p.ticker] = p.preco;

    // Avança o relógio do usuário
    await dbQuery(
      'UPDATE users SET clock_minute = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [novoMinuto, userId]
    );

    // Processa ordens pendentes do usuário com os preços recebidos da API do professor
    const ordenasExecutadas = await RelogioServico.processarOrdensPendentes(userId, precoMap, novoMinuto);

    const horaFormatada = RelogioServico.formatarHora(novoMinuto);

    logger.info(`Relógio do usuário ${userId} avançado para ${horaFormatada} (minuto ${novoMinuto}). Preços via API do professor.`);

    return {
      minutoAnterior,
      novoMinuto,
      horaFormatada,
      precosConsultados: precos.length,
      ordenasExecutadas,
    };
  }

  /**
   * Retorna o estado atual do relógio do usuário.
   * Os preços das ações da watchlist são buscados na API do professor
   * com base no minuto atual do usuário.
   */
  static async getEstado(userId: number) {
    const userResult = await dbQuery('SELECT clock_minute FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    if (!user) throw new Error('Usuário não encontrado');

    const minuto: number = user.clock_minute ?? 0;
    const horaFormatada = RelogioServico.formatarHora(minuto);

    // Busca os preços do minuto atual na API do professor
    const precos = await StockService.getPricesByMinuto(minuto);
    const precoMap: Record<string, number> = {};
    for (const p of precos) precoMap[p.ticker] = p.preco;

    // Tickers da watchlist do usuário
    const watchlistResult = await dbQuery(`
      SELECT s.symbol, s.closing_price as fechamento
      FROM watchlist w
      JOIN stocks s ON w.stock_id = s.id
      WHERE w.user_id = $1
      ORDER BY s.symbol
    `, [userId]);

    const acoes = watchlistResult.rows.map(a => {
      const preco = precoMap[a.symbol] ?? parseFloat(a.fechamento);
      const fechamento = parseFloat(a.fechamento);
      const variacaoNominal = preco - fechamento;
      const variacaoPercent = fechamento > 0 ? (variacaoNominal / fechamento) * 100 : 0;
      return {
        symbol: a.symbol,
        preco,
        fechamento,
        variacaoNominal: parseFloat(variacaoNominal.toFixed(2)),
        variacaoPercent: parseFloat(variacaoPercent.toFixed(2)),
      };
    });

    return { minuto, horaFormatada, acoes };
  }

  // ─── Privados ────────────────────────────────────────────────────────────────

  private static formatarHora(minuto: number): string {
    const totalMinutos = 14 * 60 + minuto;
    return `${String(Math.floor(totalMinutos / 60)).padStart(2, '0')}:${String(totalMinutos % 60).padStart(2, '0')}`;
  }

  private static async processarOrdensPendentes(
    userId: number,
    precoMap: Record<string, number>,
    novoMinuto: number
  ): Promise<number[]> {
    const pendentesResult = await dbQuery(`
      SELECT o.id, o.stock_id, s.symbol, o.type, o.quantity, o.limit_price
      FROM orders o
      JOIN stocks s ON o.stock_id = s.id
      WHERE o.user_id = $1 AND o.status = 'PENDING'
    `, [userId]);

    const pendentes = pendentesResult.rows;
    const executadas: number[] = [];
    const relogioStr = RelogioServico.formatarHora(novoMinuto);

    for (const order of pendentes) {
      const precoAtual = precoMap[order.symbol];
      if (precoAtual === undefined) continue;

      const limitPrice = parseFloat(order.limit_price);
      const deveExecutar =
        (order.type === 'BUY' && precoAtual <= limitPrice) ||
        (order.type === 'SELL' && precoAtual >= limitPrice);

      if (!deveExecutar) continue;

      try {
        const total = order.quantity * precoAtual;

        if (order.type === 'BUY') {
          const userRowResult = await dbQuery('SELECT balance FROM users WHERE id = $1', [userId]);
          if (parseFloat(userRowResult.rows[0].balance) < total) {
            await dbQuery(
              `UPDATE orders SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
              [order.id]
            );
            logger.warn(`Ordem ${order.id} cancelada: saldo insuficiente`);
            continue;
          }
        } else {
          const posResult = await dbQuery(
            'SELECT quantity FROM portfolio WHERE user_id = $1 AND stock_id = $2',
            [userId, order.stock_id]
          );
          const pos = posResult.rows[0];
          if (!pos || pos.quantity < order.quantity) {
            await dbQuery(
              `UPDATE orders SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
              [order.id]
            );
            logger.warn(`Ordem ${order.id} cancelada: ações insuficientes`);
            continue;
          }
        }

        await withTransaction(async (client) => {
          await client.query(`
            UPDATE orders SET status = 'EXECUTED', price = $1, total = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
          `, [precoAtual, total, order.id]);

          if (order.type === 'BUY') {
            await client.query(
              'UPDATE users SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
              [total, userId]
            );

            const existingResult = await client.query(
              'SELECT id, quantity, average_price FROM portfolio WHERE user_id = $1 AND stock_id = $2',
              [userId, order.stock_id]
            );
            const posExistente = existingResult.rows[0];

            if (posExistente) {
              const newQty = posExistente.quantity + order.quantity;
              const newAvg = ((posExistente.quantity * parseFloat(posExistente.average_price)) +
                (order.quantity * precoAtual)) / newQty;
              await client.query(`
                UPDATE portfolio SET quantity = $1, average_price = $2, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $3 AND stock_id = $4
              `, [newQty, newAvg, userId, order.stock_id]);
            } else {
              await client.query(`
                INSERT INTO portfolio (user_id, stock_id, quantity, average_price) VALUES ($1, $2, $3, $4)
              `, [userId, order.stock_id, order.quantity, precoAtual]);
            }

            const balanceResult = await client.query('SELECT balance FROM users WHERE id = $1', [userId]);
            const balanceAfter = parseFloat(balanceResult.rows[0].balance);

            await client.query(`
              INSERT INTO transactions (user_id, type, amount, description, balance_after)
              VALUES ($1, 'BUY', $2, $3, $4)
            `, [
              userId, total,
              `[${relogioStr}] Compra condicional de ${order.quantity} ações de ${order.symbol} a R$ ${precoAtual.toFixed(2)}`,
              balanceAfter
            ]);

          } else {
            await client.query(
              'UPDATE users SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
              [total, userId]
            );
            await client.query(`
              UPDATE portfolio SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP
              WHERE user_id = $2 AND stock_id = $3
            `, [order.quantity, userId, order.stock_id]);

            const balanceResult = await client.query('SELECT balance FROM users WHERE id = $1', [userId]);
            const balanceAfter = parseFloat(balanceResult.rows[0].balance);

            await client.query(`
              INSERT INTO transactions (user_id, type, amount, description, balance_after)
              VALUES ($1, 'SELL', $2, $3, $4)
            `, [
              userId, total,
              `[${relogioStr}] Venda condicional de ${order.quantity} ações de ${order.symbol} a R$ ${precoAtual.toFixed(2)}`,
              balanceAfter
            ]);
          }
        });

        executadas.push(order.id);
        logger.info(`Ordem ${order.id} (${order.type} ${order.symbol}) executada a R$ ${precoAtual} [preço via API do professor]`);

      } catch (err) {
        logger.error(`Erro ao executar ordem ${order.id}:`, err);
      }
    }

    return executadas;
  }
}
