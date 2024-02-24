// Assuming this is in your client.ts or a similar script
import WebSocketClient from './WebSocketClient';

const serverUrl =
  process.env.SERVER_URL || 'ws://localhost:8080?clientId=uniqueClientId';
const clientId = process.env.CLIENT_ID || 'uniqueClientId';

const client = new WebSocketClient(serverUrl, clientId);

// Wait for connection to establish
client
  .connect()
  .then(() => {
    console.log('Client connected successfully.');

    // Optionally, notify the parent process that the connection is ready
    if (process.send) {
      process.send({ status: 'connected' });
    }

    // Your WebSocket-dependent logic here
  })
  .catch((error) => {
    console.error('Connection failed:', error);

    // Optionally, notify the parent process of the failure
    if (process.send) {
      process.send({ status: 'failed', error: error.message });
    }
  });
