import { WsServer } from './WebsocketServer';

export interface ServerCommandMessage {
  cmd: 'start' | 'stop' | 'sendToClient' | "packet";
  port?: number;
  clientId?: string;
  data?: object;
}

// Default port, can be overridden by messages from the parent process
const DEFAULT_PORT = 8080;
let server = new WsServer(DEFAULT_PORT);

server.start();
console.log(`WebSocket Server started on port ${DEFAULT_PORT}`);

// Handler for messages from the parent process (if any)
process.on('message', (message: ServerCommandMessage) => {
  if (message.cmd) {
    switch (message.cmd) {
      case 'start':
        // Optionally handle a start command with a specific port
        const port = message.port || DEFAULT_PORT;
        if (!server) {
          server = new WsServer(port);
          server.start();
          console.log(`WebSocket Server started on port ${port}`);
        } else {
          console.log('Server is already running.');
        }
        break;
      case 'sendToClient':
          if (message.clientId && message.data) {
              server.sendToClient(message.data, message.clientId);
          }
          break;
      case 'stop':
        // Implement server stop logic here if necessary
        console.log('Stop command received.');
        // server.stop(); // Assuming you implement a stop method
        break;
      // Add more commands as needed
    }
  }
});

// // Optionally send a ready message to the parent process
// if (process.send) {
//   process.send({ cmd: 'ready' });
// }
