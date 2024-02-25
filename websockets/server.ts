// import { WsServer } from './WebsocketServer';

// export interface ServerCommandMessage {
//   cmd: 'start' | 'stop' | 'sendToClient' | 'packet' | 'broadcast';
//   port?: number;
//   clientId?: string;
//   data?: object;
// }

// const DEFAULT_PORT = 8080;
// let server = new WsServer(DEFAULT_PORT);

// function startServer(port: number = DEFAULT_PORT) {
//   server.start();
//   console.log(`WebSocket Server started on port ${port}`);

//   server.start();

//   // Optionally send a ready message to the parent process
//   if (process.send) {
//     process.send({ cmd: 'ready' });
//   }
// }
// startServer();

// export default server;
