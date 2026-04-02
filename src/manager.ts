import { WebSocket } from 'ws';

export class ConnectionManager {
  private clients = new Set<WebSocket>();
  private maxConnections: number;

  constructor(max = 10) {
    this.maxConnections = max;
  }

  connect(ws: WebSocket): boolean {
    if (this.clients.size >= this.maxConnections) {
      ws.close(1008, 'Too many connections');
      return false;
    }
    this.clients.add(ws);
    console.log(`Client connected. Total: ${this.clients.size}`);
    return true;
  }

  disconnect(ws: WebSocket): void {
    this.clients.delete(ws);
    console.log(`Client disconnected. Total: ${this.clients.size}`);
  }

  broadcast(data: object): void {
    const msg = JSON.stringify(data);
    const dead: WebSocket[] = [];

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      } else {
        dead.push(client);
      }
    }

    for (const ws of dead) {
      this.clients.delete(ws);
    }
  }

  get size(): number {
    return this.clients.size;
  }
}
