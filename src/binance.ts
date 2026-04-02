import WebSocket from 'ws';
import { EventEmitter } from 'events';

// Combined stream for BTC, ETH, BNB (bonus: multiple pairs)
// Using data-stream.binance.vision — same API, no geo-restrictions (avoids 451 on cloud hosts)
const STREAM_URL =
  'wss://data-stream.binance.vision/stream?streams=btcusdt@ticker/ethusdt@ticker/bnbusdt@ticker';

export interface PriceUpdate {
  symbol: string;
  price: string;
  change_pct: string;
  timestamp: number;
}

export function startBinanceListener(emitter: EventEmitter): void {
  let backoff = 1000; // ms, doubles on each failure up to 60s

  function connect(): void {
    console.log('Connecting to Binance stream...');
    const ws = new WebSocket(STREAM_URL);

    ws.on('open', () => {
      console.log('Connected to Binance stream.');
      backoff = 1000; // reset on successful connection
    });

    ws.on('message', (raw: WebSocket.RawData) => {
      try {
        const envelope = JSON.parse(raw.toString());
        // Combined stream wraps payload: { stream: "...", data: { ... } }
        const data = envelope.data ?? envelope;

        const update: PriceUpdate = {
          symbol:     data.s,   // e.g. "BTCUSDT"
          price:      data.c,   // last price
          change_pct: data.P,   // 24h change %
          timestamp:  data.E,   // event time (epoch ms)
        };

        emitter.emit('price', update);
      } catch (err) {
        console.error('Failed to parse Binance message:', err);
      }
    });

    ws.on('close', () => {
      console.log(`Binance WS closed. Reconnecting in ${backoff}ms...`);
      setTimeout(connect, backoff);
      backoff = Math.min(backoff * 2, 60_000);
    });

    ws.on('error', (err: Error) => {
      console.error('Binance WS error:', err.message);
      ws.terminate(); // triggers 'close' event → reconnect
    });
  }

  connect();
}
