import { pullPacketsForParsing } from './pullPacketsForParsing';
import { initDb, packetQueue } from '../db/dbService';
import type { Packet } from '../characters/packet.type';
import { WsServer } from '../websockets/WebsocketServer';

const DEFAULT_PORT = 8080;
const server = new WsServer(DEFAULT_PORT);
server.start();

initDb();

let isActive = false;
async function startProcessing() {
  server.server?.on('message', (message: string) => {
    console.log('Message from server process:', message);

    try {
      const packet: Packet = JSON.parse(message.toString()); // Convert Buffer to string before parsing
      console.info('Received packet:', packet.packetNr);
      // Validate packet or transform it into the correct format if necessary
      packetQueue.enqueue(packet); // Enqueue for processing
      if (!packetQueue.isEmpty) {
        isActive = true;
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });
  if (isActive) {
    // Your polling and processing logic here
    await pullPacketsForParsing();
  }
}
server.server?.on('message', (message: string) => {
  console.log('Message Recieved', message);
  if (message === 'start') {
    isActive = true;
    console.log('isActive', isActive);
  }
  if (isActive) {
    startProcessing().catch((err) =>
      console.error('Error in message processing:', err)
    );
  }
});
