import WebSocketClient from './WebSocketClient';

// Define the type for the environment variables
interface Env {
  SERVER_URL: string;
  CLIENT_ID: string;
}

// Define the type for messages sent to the parent process
interface ConnectionStatusMessage {
  status: 'connected' | 'failed';
  error?: string;
}

// Extract environment variables with type assertion
const env: Env = {
  SERVER_URL:
    process.env.SERVER_URL || 'ws://localhost:8080?clientId=uniqueClientId',
  CLIENT_ID: process.env.CLIENT_ID || 'uniqueClientId',
};

const client = new WebSocketClient(env.SERVER_URL, env.CLIENT_ID);

// Function to send typed messages to the parent process
const sendMessageToParent = (message: ConnectionStatusMessage): void => {
  if (process.send) {
    process.send(message);
  }
};

// Wait for the WebSocket client to connect
client
  .connect()
  .then(() => {
    console.log('WebSocket client connected successfully.');
    sendMessageToParent({ status: 'connected' });
  })
  .catch((error: Error) => {
    console.error('WebSocket client failed to connect:', error.message);
    sendMessageToParent({ status: 'failed', error: error.message });
  });
