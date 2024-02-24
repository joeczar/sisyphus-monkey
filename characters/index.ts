import fs from 'fs';
import path from 'path';
import WebSocket from 'ws';
import type { Packet } from './packet.type';
import readline from 'readline';

const wsServers = {
  word: 'ws://192.168.178.141:8080',
  mac: 'ws://192.168.178.126:8080',
};

const FOLDER_PATH = path.resolve(__dirname, '../generated-letters-chunked');

let ws: WebSocket;

let packetNr = 0;

// Thresholds for backpressure handling
const HIGH_WATER_MARK = 64 * 1024; // 64KB
const BACKPRESSURE_THRESHOLD = HIGH_WATER_MARK / 4; // Resume reading when bufferedAmount falls below this

import clientProcess from '../websockets/clientProcess';

clientProcess.send({ cmd: 'start', port: 8080 });


// // Function to initialize WebSocket connection
// function initializeWebSocket(wsAddress: string) {
//   ws = new WebSocket(wsAddress);

//   ws.on('open', function open() {
//     console.log('Connected to the server.');
//     processFolder(FOLDER_PATH).then(() => {
//       console.log('All files processed.');
//       ws.close();
//     });
//   });

//   ws.on('error', function error(err) {
//     console.error('WebSocket error:', err);
//     askForNewIP(); // Call function to prompt user for new IP
//   });
// }
// // Function to prompt user for new IP address
// function askForNewIP() {
//   const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
//   });

//   rl.question(
//     'Connection failed. Please enter a new WebSocket IP address (e.g., ws://192.168.1.1:8080): ',
//     (newIp) => {
//       rl.close();
//       initializeWebSocket(newIp); // Initialize WS with new IP
//     }
//   );
// }

// // Initial WS connection attempt
// initializeWebSocket(wsServers.word);
let isActive = false;
async function processFileLetterByLetter(filePath: string) {
  return new Promise<void>((resolve, reject) => {
    clientProcess.on("start",(message)=>{
      isActive = true;

    })
    clientProcess.on("message",(message)=>{
      console.log("messageRecieved", message)

    })
    const readStream = fs.createReadStream(filePath, {
      encoding: 'utf8',
      highWaterMark: HIGH_WATER_MARK,
    });
    if (isActive) {

    setInterval(() => {
      readStream.on('data', (chunk) => {
        // Send data only if WebSocket's bufferedAmount is below the threshold
        if (ws.bufferedAmount < BACKPRESSURE_THRESHOLD) {
          // count chars in chunk
          const charCount = chunk.toString().split('').length;
          const packet: Packet = {
            chunk: chunk.toString(),
            charCount,
            packetNr,
          };
          clientProcess.send({cmd:"packet",data:{packet: JSON.stringify(packet)}});
          // console.log(packet.chunk);
          packetNr++;
        } else {
          // Pause reading if we hit the threshold
          readStream.pause();

          // Check bufferedAmount and resume reading when it decreases below threshold
          const interval = setInterval(() => {
            if (ws.bufferedAmount < BACKPRESSURE_THRESHOLD) {
              clearInterval(interval);
              readStream.resume();
            }
          }, 100); // Check every 100ms
        }
      });
    }, 50);

    readStream.on('end', () => {
      // console.log(`Finished processing file: ${filePath}`);
      resolve();
    });

    readStream.on('error', (err) => {
      console.error('Stream error:', err);
      reject(err);
    });
  }
  });
}

async function processFolder(folderPath: string) {
  const files = await fs.promises.readdir(folderPath);
  for (const fileName of files) {
    const filePath = path.join(folderPath, fileName);
    if (fs.statSync(filePath).isFile()) {
      // Ensure you're reading files
      console.log(`Processing file: ${fileName}`);
      await processFileLetterByLetter(filePath);
    }
  }
}
