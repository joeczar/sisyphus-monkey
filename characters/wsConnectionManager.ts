import WebSocket from 'ws';
import readline from 'readline';

export class WSConnectionManager {
  ws: WebSocket | null = null;

  constructor(private wsAddress: string) {}

  initializeWebSocket(onOpen: () => void): void {
    this.ws = new WebSocket(this.wsAddress);

    this.ws.on('open', onOpen);

    this.ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
      this.askForNewIP();
    });
  }

  private askForNewIP(): void {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(
      'Connection failed. Please enter a new WebSocket IP address: ',
      (newIp) => {
        rl.close();
        this.wsAddress = newIp;
        this.initializeWebSocket(() =>
          console.log('Reconnected successfully.')
        );
      }
    );
  }

  send(data: string): void {
    if (this.ws) {
      this.ws.send(data);
    } else {
      console.error("WebSocket isn't initialized.");
    }
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
    }
  }
}
