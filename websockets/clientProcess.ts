import { fork } from 'child_process';
import path from 'path';

const clientProcess = fork(path.join(__dirname, 'client.ts'));

export default clientProcess;
