import WebSocketClient from './WebSocketClient';

// Assuming configurations are passed via environment variables for simplicity
const serverUrl =
  process.env.SERVER_URL || 'ws://localhost:8080?clientId=uniqueClientId';
const clientId = process.env.CLIENT_ID || 'uniqueClientId';

const client = new WebSocketClient(serverUrl, clientId);
client.connect();

// Handle process events, e.g., clean up on exit
process.on('SIGINT', () => {
  // Clean up client resources
  console.log('Client process exiting');
  process.exit();
});
