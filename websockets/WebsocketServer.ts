// WebSocketServer.ts
import type { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

export class WsServer {
  public server?: WebSocketServer;
  private port: number;
  private clients: Map<string, WebSocket> = new Map();
  private messageHandlers: Map<string, (message: string) => void> = new Map();
  private closeHandlers: Map<string, () => void> = new Map();

  constructor(port: number, server?: WebSocketServer) {
    this.port = port;
    if (server) {
      this.server = new WebSocketServer({ port: this.port });
    } else {
      this.server = new WebSocketServer({ port: this.port });
    }
  }

  public start(): void {
    if (!this.server) {
      console.log("WebSocket Server can't be started, server is undefined.");
      return;
    }

    this.server.on('connection', (ws, req) => {
      const clientId = this.getClientId(req);
      if (clientId) {
        this.clients.set(clientId, ws);
        console.log(`Client connected: ${clientId}`);

        // Setup message handling
        ws.on('message', (message) => {
          this.onMessage(clientId, message.toString());
          // Call custom message handler if exists
          const handler = this.messageHandlers.get(clientId);
          if (handler) {
            handler(message.toString());
          }
        });

        // Setup close handling
        ws.on('close', () => {
          this.onClose(clientId);
          // Call custom close handler if exists
          const handler = this.closeHandlers.get(clientId);
          if (handler) {
            handler();
          }
        });
      }
    });

    console.log(`WebSocket Server started on port ${this.port}`);
  }

  // Allow users to set custom message handlers
  public onClientMessage(
    clientId: string,
    handler: (message: string) => void
  ): void {
    this.messageHandlers.set(clientId, handler);
  }

  // Allow users to set custom close handlers
  public onClientClose(clientId: string, handler: () => void): void {
    this.closeHandlers.set(clientId, handler);
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
  public isRunning(): boolean {
    return this.server ? true : false;
  }
  public stop(): void {
    if (this.server) {
      this.server.close();
      this.server = undefined;
      console.log('WebSocket Server stopped');
    }
  }
}

export default WebSocketServer;
