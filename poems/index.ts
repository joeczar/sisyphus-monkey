import clientProcess from '../websockets/clientProcess';

clientProcess.send({ cmd: 'start', port: 8080 });
