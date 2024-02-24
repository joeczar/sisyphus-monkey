import { pullPacketsForParsing } from './pullPacketsForParsing';
import { initDb, packetQueue } from '../db/dbService';
import type { Packet } from '../characters/packet.type';
import serverProcess from '../websockets/serverProcess';

serverProcess.send({ cmd: 'start', port: 8080 });

initDb();

async function startProcessing() {
  // Your polling and processing logic here
  await pullPacketsForParsing();

  serverProcess.on('message', (message) => {
    try {
      const packet: Packet = JSON.parse(message.toString()); // Convert Buffer to string before parsing
      console.info('Received packet:', packet.packetNr);
      // Validate packet or transform it into the correct format if necessary
      packetQueue.enqueue(packet); // Enqueue for processing
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });
}

startProcessing().catch((err) =>
  console.error('Error in message processing:', err)
);
export {serverProcess}