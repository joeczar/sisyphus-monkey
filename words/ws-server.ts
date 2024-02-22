import WebSocket from 'ws';

import { getIpAddress } from '../utils/ip';

const ip = getIpAddress();

const wss = new WebSocket.Server({ port: 8080 });
console.log('IP: ', ip);
wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
    // Here, you would process the incoming character stream
    // and check for words as per your logic
  });
  ws.on('error', function error(err) {
    console.error('WebSocket error:', err);
  });

  ws.on('close', function close() {
    console.log('Disconnected');
  });

  // You can also use ws.send to send data to the client
});

console.log('WebSocket server started on ws://localhost:8080');
