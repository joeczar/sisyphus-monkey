// WebSocketServer.ts
import type { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

export class WsServer {
  private server?: WebSocketServer;
  private port: number;
  private clients: Map<string, WebSocket> = new Map();

  constructor(port: number) {
    this.port = port;
  }

  public start(): void {
    this.server = new WebSocketServer({ port: this.port });
    this.server.on('connection', (ws, req) => {
      const clientId = this.getClientId(req);
      if (clientId) {
        this.clients.set(clientId, ws);
        console.log(`Client connected: ${clientId}`);

        ws.on('message', (message) =>
          this.onMessage(clientId, message.toString())
        ); // Convert message to string
        ws.on('close', () => this.onClose(clientId));
      }
    });
    console.log(`WebSocket Server started on port ${this.port}`);
  }

  // Default getClientId method - Override to implement custom logic
  protected getClientId(req: IncomingMessage): string | null {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const clientId = url.searchParams.get('clientId');
    return clientId;
  }

  // Default event handlers - Can be overridden in subclasses or instances
  protected onMessage(clientId: string, message: string): void {
    console.log(`Message from ${clientId}: ${message}`);

    // Example of processing the message and preparing a response
    const responseData = { message: `Received your message: ${message}` };

    // Send a response back to the specific client
    this.sendToClient(responseData, clientId);
  }

  public sendToClient(data: object, clientId: string): void {
    const client = this.clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    } else {
      console.log(`Client ${clientId} is not connected.`);
    }
  }

  protected onClose(clientId: string): void {
    this.clients.delete(clientId);
    console.log(`Client disconnected: ${clientId}`);
  }

  public broadcast(message: string): void {
    this.clients.forEach((client) => {
      client.send(message);
    });
  }
}

export default WebSocketServer;
