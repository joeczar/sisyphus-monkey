// WebSocketClient.ts
import WebSocket from 'ws';

class WebSocketClient {
  private client?: WebSocket;
  private serverUrl: string; // e.g. 'ws://example.com?clientId=uniqueClientId'
  private clientId: string;

  constructor(serverUrl: string, clientId: string) {
    this.serverUrl = serverUrl;
    this.clientId = clientId;
  }

  public connect(): void {
    this.client = new WebSocket(this.serverUrl);

    this.client.on('open', () => this.onOpen());
    this.client.on('message', (data) => this.onMessage(data));
    this.client.on('close', () => this.onClose());
    this.client.on('error', (error) => this.onError(error));
  }

  // Event handlers can be overridden by subclasses or instances
  protected onOpen(): void {
    console.log('Connected to server');
    this.send(JSON.stringify({ clientId: this.clientId }));
  }

  protected onMessage(data: WebSocket.Data) {
    console.log(`Message from server: ${data}`);
    return data;
  }

  protected onClose(): void {
    console.log('Disconnected from server');
  }

  protected onError(error: Error): void {
    console.error(`WebSocket error: ${error.message}`);
  }

  public send(message: Object): void {
    const payload = { ...message, clientId: this.clientId };
    if (this.client && this.client.readyState === WebSocket.OPEN) {
      this.client.send(JSON.stringify(payload));
    } else {
      console.log('WebSocket is not open. Cannot send message.');
    }
  }
}

export default WebSocketClient;
