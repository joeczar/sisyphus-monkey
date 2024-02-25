import WebSocket from 'ws';

class WebSocketClient {
  public client?: WebSocket;
  private serverUrl: string;
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
        console.log('Connected to server');
        this.send({ clientId: this.clientId });
        this.flushMessageQueue();
        resolve();
      });

      this.client.on('close', () => console.log('Disconnected from server'));
      this.client.on('error', (error) => {
        console.error(`WebSocket error: ${error.message}`);
        reject(error);
      });
    });
  }

  public onClose(handler: () => void): void {
    if (this.client) {
      this.client.on('close', handler);
    }
  }

  public onError(handler: (error: Error) => void): void {
    if (this.client) {
      this.client.on('error', handler);
    }
  }

  public send(message: Object): void {
    const payload = JSON.stringify({ ...message, clientId: this.clientId });
    if (this.client && this.client.readyState === WebSocket.OPEN) {
      this.client.send(payload);
    } else {
      this.messageQueue.push(message);
      console.log('WebSocket is not open. Queuing message.');
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) this.send(message);
    }
  }
  public getBufferedAmount(): number {
    if (this.client) {
      return this.client.bufferedAmount;
    } else {
      return 0;
    }
  }
}

export default WebSocketClient;
