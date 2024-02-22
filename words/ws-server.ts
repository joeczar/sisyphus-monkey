import WebSocket from 'ws';
import { getIpAddress } from '../utils/ip';
import {
  initDb,
  insertPacketIntoDB,
  packetQueue,
  processPackets,
} from '../db/dbService';

// Initialize the database
initDb();

// Start processing packets from the queue in the background
processPackets(packetQueue).catch((err) =>
  console.error('Error processing packets:', err)
);

const ip = getIpAddress();
const wss = new WebSocket.Server({ port: 8080 });

console.log(`WebSocket server started on ws://${ip}:8080`);

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
    // Assuming `message` is a JSON string that needs to be parsed into a Packet type
    try {
      const packet = JSON.parse(message.toString()); // Convert Buffer to string before parsing
      // Validate packet or transform it into the correct format if necessary
      packetQueue.enqueue(packet); // Enqueue for processing
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('error', function error(err) {
    console.error('WebSocket error:', err);
  });

  ws.on('close', function close() {
    console.log('Disconnected');
  });
});
