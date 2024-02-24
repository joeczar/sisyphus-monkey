import WebSocket from 'ws';
import { IncomingMessage } from 'http';
import { URL } from 'url';

export interface WebSocketClient {
  send(data: string): void;
}

export interface Message {
  clientId?: string;
  [key: string]: any;
}

export class WebSockets {
  private clients: Map<string, WebSocketClient>;
  private server: WebSocket.Server;

  constructor(port: number) {
    this.clients = new Map<string, WebSocketClient>();
    this.server = new WebSocket.Server({ port });
    this.setupServer();
  }

  private setupServer(): void {
    this.server.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      let clientId: string | null = null;

      // Extract clientId from query params
      const params = new URL(req.url!, `http://${req.headers.host}`)
        .searchParams;
      clientId = params.get('clientId') || null;

      if (clientId) {
        this.addClient(clientId, ws);
      }

      this.setupClient(ws, clientId);
    });
  }

  private setupClient(ws: WebSocket, clientId: string | null): void {
    ws.on('message', (data: WebSocket.Data) => {
      if (!clientId) {
        clientId = this.handleFirstMessage(data.toString(), ws);
        return;
      }
      this.onMessage(data.toString(), ws, clientId);
    });

    ws.on('close', () => {
      if (clientId) {
        this.removeClient(clientId);
      }
    });
  }

  private handleFirstMessage(data: string, ws: WebSocket): string | null {
    try {
      const message: Message = JSON.parse(data);
      if (message.clientId) {
        this.addClient(message.clientId, ws);
        return message.clientId;
      }
    } catch (error) {
      console.error('Error parsing the first message for clientId:', error);
    }
    return null;
  }

  private addClient(clientId: string, ws: WebSocket): void {
    this.clients.set(clientId, ws);
    console.log(`Client added with ID: ${clientId}`);
  }

  private removeClient(clientId: string): void {
    this.clients.delete(clientId);
    console.log(`Client removed with ID: ${clientId}`);
  }

  public send(message: object, clientId: string | null = null): void {
    const data: string = JSON.stringify(message);
    if (clientId) {
      const client = this.clients.get(clientId);
      if (client) {
        client.send(data);
      } else {
        console.log(`Client not found: ${clientId}`);
      }
    } else {
      this.clients.forEach((client) => client.send(data));
    }
  }

  private onMessage(data: string, ws: WebSocket, clientId: string): void {
    console.log(`Message from ${clientId}:`, data);
    // Implement custom logic based on clientId and data received
  }
}
