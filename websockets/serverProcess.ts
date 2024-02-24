// createServerProcess.ts
import { fork } from 'child_process';
import * as path from 'path';

const serverProcess = fork(path.join(__dirname, 'server.ts')); // Directly point to .ts file

export default serverProcess;
