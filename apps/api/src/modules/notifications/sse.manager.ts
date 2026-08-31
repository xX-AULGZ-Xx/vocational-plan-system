import { Response } from 'express';

interface SSEClient {
  userId: string;
  res: Response;
}

class SSEManager {
  private clients: SSEClient[] = [];

  constructor() {
    // Send heartbeat every 25 seconds to keep connection alive across proxies/browsers
    setInterval(() => {
      this.broadcastHeartbeat();
    }, 25000);
  }

  public addClient(userId: string, res: Response) {
    this.clients.push({ userId, res });
    console.log(`[SSEManager] Client connected: user=${userId}, total active=${this.clients.length}`);

    // Initial greeting event
    res.write(`event: connected\ndata: ${JSON.stringify({ message: 'SSE stream connected', timestamp: new Date().toISOString() })}\n\n`);

    res.on('close', () => {
      this.removeClient(res);
    });
  }

  public removeClient(res: Response) {
    const index = this.clients.findIndex((c) => c.res === res);
    if (index !== -1) {
      const removed = this.clients.splice(index, 1)[0];
      console.log(`[SSEManager] Client disconnected: user=${removed.userId}, remaining=${this.clients.length}`);
    }
  }

  public sendToUser(userId: string, eventName: string, data: any) {
    const targetClients = this.clients.filter((c) => c.userId === userId.toString());
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;

    targetClients.forEach((client) => {
      try {
        client.res.write(payload);
      } catch (err: any) {
        console.error(`[SSEManager] Failed to send to user ${userId}:`, err.message);
      }
    });
  }

  public broadcast(eventName: string, data: any) {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    this.clients.forEach((client) => {
      try {
        client.res.write(payload);
      } catch (err: any) {
        console.error(`[SSEManager] Failed to broadcast:`, err.message);
      }
    });
  }

  private broadcastHeartbeat() {
    const heartbeat = `: ping ${new Date().toISOString()}\n\n`;
    this.clients.forEach((client) => {
      try {
        client.res.write(heartbeat);
      } catch (err) {
        // Ignored
      }
    });
  }
}

export const sseManager = new SSEManager();
