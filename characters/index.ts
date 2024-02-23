// index.ts
import path from 'path';
import { WSConnectionManager } from './wsConnectionManager';
import { processFolder } from './fileProcessor';

const wsAddress = 'ws://192.168.178.141:8080'; // Default WebSocket address
const FOLDER_PATH = path.resolve(__dirname, '../generated-letters-chunked');
const wsManager = new WSConnectionManager(wsAddress);

wsManager.initializeWebSocket(() => {
  console.log('Connected to the server.');
  processFolder(FOLDER_PATH, wsManager);
});
