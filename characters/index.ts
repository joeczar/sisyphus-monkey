import WebSocket from 'ws';
import fs from 'fs';
const filePath = '../generated-letters-chunked';


const ws = new WebSocket('ws://localhost:8080');

try {
  ws.on('open', function open() {
    console.log('Connected to the server.');
    setInterval(() => {
      ws.ping();
      console.log("Ping")
    }, 30000); // Ping every 30 seconds

  
    // const readStream = fs.createReadStream(filePath, { encoding: 'utf8', highWaterMark: 1 });
  
    // readStream.on('data', (chunk) => {
    //   ws.send(chunk.toString());
    // });
  
    // readStream.on('end', () => {
    //   ws.close();
    // });
  });
  
  ws.on('close', () => console.log('Disconnected from server.'));
  
  
} catch (error) {
  console.error("Chars WS Error", error)
}
