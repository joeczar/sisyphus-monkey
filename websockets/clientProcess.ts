import { fork } from 'child_process';
import * as path from 'path';

// Environment variables could be used to pass configuration to the client process
const env = {
  SERVER_URL:
    process.env.SERVER_URL || 'ws://word.local:8080?clientId=uniqueClientId',
  CLIENT_ID: process.env.CLIENT_ID || 'uniqueClientId',
};

const clientProcess = fork(path.join(__dirname, 'client.ts'), [], { env });

export default clientProcess;
