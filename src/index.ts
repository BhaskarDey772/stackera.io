import 'dotenv/config';
import { EventEmitter } from 'events';
import { startBinanceListener } from './binance';
import { createServer } from './server';

const emitter = new EventEmitter();

// Start listening to Binance WebSocket stream
startBinanceListener(emitter);

// Create HTTP + WebSocket server
const server = createServer(emitter);

const PORT = parseInt(process.env.PORT ?? '8000', 10);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`);
  console.log(`REST endpoint:      http://localhost:${PORT}/price?symbol=btcusdt`);
});
