import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import { ConnectionManager } from './manager';
import { PriceUpdate } from './binance';

// In-memory cache of latest price per symbol (for GET /price)
export const latestPrices: Record<string, PriceUpdate> = {};

export function createServer(emitter: EventEmitter): http.Server {
  const app = express();
  app.use(express.static(path.join(__dirname, '..', 'public')));
  const server = http.createServer(app);

  const maxConnections = parseInt(process.env.MAX_CONNECTIONS ?? '10', 10);
  const manager = new ConnectionManager(maxConnections);

  // ---- WebSocket server on /ws ----
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    const accepted = manager.connect(ws);
    if (!accepted) return; // already rejected with code 1008

    // Send all current prices immediately on connect
    for (const price of Object.values(latestPrices)) {
      ws.send(JSON.stringify(price));
    }

    ws.on('close', () => manager.disconnect(ws));
    ws.on('error', () => manager.disconnect(ws));
  });

  // ---- Relay Binance price events to all WS clients ----
  emitter.on('price', (data: PriceUpdate) => {
    latestPrices[data.symbol.toLowerCase()] = data;
    manager.broadcast(data);
  });

  // ---- REST endpoint: GET /price?symbol=btcusdt ----
  app.get('/price', (req: Request, res: Response) => {
    const symbol = ((req.query.symbol as string) ?? 'btcusdt').toLowerCase();

    // Return all prices if no symbol specified or symbol is "all"
    if (symbol === 'all') {
      return res.json(latestPrices);
    }

    const data = latestPrices[symbol];
    if (!data) {
      return res.status(404).json({ error: `No data yet for symbol: ${symbol}` });
    }
    return res.json(data);
  });

  return server;
}
