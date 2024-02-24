import { fork } from 'child_process';
import WebSocketClient from './WebSocketClient';
import path from 'path';

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

const clientProcess = fork(path.join(__dirname, 'client.ts'));

export default clientProcess;
