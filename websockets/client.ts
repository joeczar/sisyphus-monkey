import WebSocketClient from './WebSocketClient';
import readline from 'readline';
import path from 'path';

let clientId = process.env.CLIENT_ID || 'uniqueClientId';
let serverUrl =
  process.env.SERVER_URL || `ws://localhost:8080?clientId=${clientId}`;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, (input: string | PromiseLike<string>) => {
      resolve(input);
    });
  });
}

export async function promptForInput() {
  console.log(`Server URL: ${serverUrl}`);
  console.log(`Client ID: ${clientId}`);

  const useDefaults = await question(
    'Do you want to use these settings? (y/n) '
  );

  if (useDefaults.toLowerCase() !== 'y') {
    const serverUrlInput = await question(
      'Please enter the server URL (e.g. ws://localhost:8080): '
    );
    const clientIdInput = await question('Please enter the client ID: ');

    // Only update clientId and serverUrl if inputs are provided
    clientId = clientIdInput || clientId;
    serverUrl = serverUrlInput
      ? `ws://${serverUrlInput.replace(/^ws:\/\//, '')}?clientId=${clientId}`
      : serverUrl;
  }
  rl.close();
}

export async function handleConnection() {
  // Create the WebSocketClient instance with the updated settings
  const client = new WebSocketClient(serverUrl, clientId);

  console.log(`Attempting to connect to ${serverUrl}`);
  try {
    await client.connect();
    console.log('Client connected successfully.', clientId);
    // Additional logic...
  } catch (error) {
    console.error('Connection failed:', error);
    // Additional error handling...
  }
  return client;
}

export async function initializeWsClient() {
  await promptForInput();
  const client = await handleConnection();
  return client;
}
