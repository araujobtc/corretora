import db from '../config/database.js';
import { StockService} from './stockService.js';
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
    const user = db.prepare('SELECT clock_minute FROM users WHERE id = ?').get(userId) as any;
    if (!user) throw new Error('Usuário não encontrado');

    const minutoAnterior: number = user.clock_minute ?? 0;
    const novoMinuto = (minutoAnterior + minutos) % 60;

    // Busca preços diretamente da API do professor (ponte pura, sem gravar no banco)
    const precos = await StockService.getPricesByMinuto(novoMinuto);
    const precoMap: Record<string, number> = {};
    for (const p of precos) precoMap[p.ticker] = p.preco;

    // Avança o relógio do usuário
    db.prepare('UPDATE users SET clock_minute = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(novoMinuto, userId);

    // Processa ordens pendentes do usuário com os preços recebidos da API do professor
    const ordenasExecutadas = RelogioServico.processarOrdensPendentes(userId, precoMap, novoMinuto);

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
    const user = db.prepare('SELECT clock_minute FROM users WHERE id = ?').get(userId) as any;
    if (!user) throw new Error('Usuário não encontrado');

    const minuto: number = user.clock_minute ?? 0;
    const horaFormatada = RelogioServico.formatarHora(minuto);

    // Busca os preços do minuto atual na API do professor
    const precos = await StockService.getPricesByMinuto(minuto);
    const precoMap: Record<string, number> = {};
    for (const p of precos) precoMap[p.ticker] = p.preco;

    // Tickers da watchlist do usuário
    const watchlist = db.prepare(`
      SELECT s.symbol, s.closing_price as fechamento
      FROM watchlist w
      JOIN stocks s ON w.stock_id = s.id
      WHERE w.user_id = ?
      ORDER BY s.symbol
    `).all(userId) as any[];

    const acoes = watchlist.map(a => {
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

  private static processarOrdensPendentes(
    userId: number,
    precoMap: Record<string, number>,
    novoMinuto: number
  ): number[] {
    const pendentes = db.prepare(`
      SELECT o.id, o.stock_id, s.symbol, o.type, o.quantity, o.limit_price
      FROM orders o
      JOIN stocks s ON o.stock_id = s.id
      WHERE o.user_id = ? AND o.status = 'PENDING'
    `).all(userId) as any[];

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
          const userRow = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as any;
          if (parseFloat(userRow.balance) < total) {
            db.prepare(`UPDATE orders SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
              .run(order.id);
            logger.warn(`Ordem ${order.id} cancelada: saldo insuficiente`);
            continue;
          }
        } else {
          const pos = db.prepare('SELECT quantity FROM portfolio WHERE user_id = ? AND stock_id = ?')
            .get(userId, order.stock_id) as any;
          if (!pos || pos.quantity < order.quantity) {
            db.prepare(`UPDATE orders SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
              .run(order.id);
            logger.warn(`Ordem ${order.id} cancelada: ações insuficientes`);
            continue;
          }
        }

        db.transaction(() => {
          db.prepare(`
            UPDATE orders SET status = 'EXECUTED', price = ?, total = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(precoAtual, total, order.id);

          if (order.type === 'BUY') {
            db.prepare('UPDATE users SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
              .run(total, userId);

            const posExistente = db.prepare(
              'SELECT id, quantity, average_price FROM portfolio WHERE user_id = ? AND stock_id = ?'
            ).get(userId, order.stock_id) as any;

            if (posExistente) {
              const newQty = posExistente.quantity + order.quantity;
              const newAvg = ((posExistente.quantity * parseFloat(posExistente.average_price)) +
                (order.quantity * precoAtual)) / newQty;
              db.prepare(`
                UPDATE portfolio SET quantity = ?, average_price = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND stock_id = ?
              `).run(newQty, newAvg, userId, order.stock_id);
            } else {
              db.prepare(`
                INSERT INTO portfolio (user_id, stock_id, quantity, average_price) VALUES (?, ?, ?, ?)
              `).run(userId, order.stock_id, order.quantity, precoAtual);
            }

            const balanceAfter = parseFloat(
              (db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as any).balance
            );
            db.prepare(`
              INSERT INTO transactions (user_id, type, amount, description, balance_after)
              VALUES (?, 'BUY', ?, ?, ?)
            `).run(
              userId, total,
              `[${relogioStr}] Compra condicional de ${order.quantity} ações de ${order.symbol} a R$ ${precoAtual.toFixed(2)}`,
              balanceAfter
            );

          } else {
            db.prepare('UPDATE users SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
              .run(total, userId);
            db.prepare(`
              UPDATE portfolio SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP
              WHERE user_id = ? AND stock_id = ?
            `).run(order.quantity, userId, order.stock_id);

            const balanceAfter = parseFloat(
              (db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as any).balance
            );
            db.prepare(`
              INSERT INTO transactions (user_id, type, amount, description, balance_after)
              VALUES (?, 'SELL', ?, ?, ?)
            `).run(
              userId, total,
              `[${relogioStr}] Venda condicional de ${order.quantity} ações de ${order.symbol} a R$ ${precoAtual.toFixed(2)}`,
              balanceAfter
            );
          }
        })();

        executadas.push(order.id);
        logger.info(`Ordem ${order.id} (${order.type} ${order.symbol}) executada a R$ ${precoAtual} [preço via API do professor]`);

      } catch (err) {
        logger.error(`Erro ao executar ordem ${order.id}:`, err);
      }
    }

    return executadas;
  }
}
