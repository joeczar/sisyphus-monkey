// WebSocketClient.ts
import WebSocket from 'ws';

class WebSocketClient {
  private client?: WebSocket;
  private serverUrl: string; // e.g. 'ws://example.com?clientId=uniqueClientId'
  private clientId: string;
  private messageQueue: Object[] = [];

  constructor(serverUrl: string, clientId: string) {
    this.serverUrl = serverUrl;
    this.clientId = clientId;
  }
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client = new WebSocket(this.serverUrl);

      this.client.on('open', () => {
        this.onOpen();
        resolve(); // Resolve the promise here
      });
      this.client.on('message', (data) => this.onMessage(data));
      this.client.on('close', () => this.onClose());
      this.client.on('error', (error) => {
        this.onError(error);
        reject(error); // Reject the promise on error
      });
    });
  }

  protected onOpen(): void {
    console.log('Connected to server');
    this.send(JSON.stringify({ clientId: this.clientId }));
    this.flushMessageQueue();
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
      // Queue the message if the connection is not open
      this.messageQueue.push(payload);
      console.log('WebSocket is not open. Queuing message.');
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) this.send(message);
    }
  }
}

export default WebSocketClient;
