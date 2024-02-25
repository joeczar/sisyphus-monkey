import WebSocketClient from './WebSocketClient';
import readline from 'readline';

let clientId = process.env.CLIENT_ID || 'uniqueClientId';
let serverUrl =
  process.env.SERVER_URL || `ws://localhost:8080?clientId=${clientId}`;

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function promptForInput() {
  return new Promise((resolve, reject) => {
    console.log(`Server URL: ${serverUrl}`);
    console.log(`Client ID: ${clientId}`);
    // Ask user if they want to update the server URL and client ID
    rl.question('Do you want to use these settings? (y/n) ', (answer) => {
      if (answer.toLowerCase() === 'y') {
        rl.close();
        resolve(void 0);
      } else {
        rl.question('Please enter the server URL: ', (serverUrlInput) => {
          serverUrl = serverUrlInput.trim();
          rl.question('Please enter the client ID: ', (clientIdInput) => {
            clientId = clientIdInput.trim();
            serverUrl = `ws://localhost:8080?clientId=${clientId}`; // Update the server URL with the new clientId
            rl.close();
            resolve(void 0);
          });
        });
      }
    });
  });
}

async function handleConnection() {
  // Create the WebSocketClient instance with the updated settings
  const client = new WebSocketClient(serverUrl, clientId);

  // Attempt to connect to the server
  console.log(`Attempting to connect to ${serverUrl}`);
  try {
    await client.connect();
    console.log('Client connected successfully.', clientId);

    // Optionally, notify the parent process that the connection is ready
    if (process.send) {
      process.send({ status: 'connected' });
    }

    // Your WebSocket-dependent logic here
  } catch (error) {
    console.error('Connection failed:', error);

    // Optionally, notify the parent process of the failure
    if (process.send) {
      process.send({ status: 'failed', error: error.message });
    }
  }
}

// Start the input prompt and then handle the connection
await promptForInput().then(handleConnection);
