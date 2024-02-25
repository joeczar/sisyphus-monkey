import fs from 'fs';
import path from 'path';
import type { Packet } from './packet.type';
import readline from 'readline';
import clientProcess from '../websockets/clientProcess';
import { initializeWsClient } from '../websockets/client';

const FOLDER_PATH = path.resolve(__dirname, '../generated-letters-chunked');

let packetNr = 0;

// Thresholds for backpressure handling
const HIGH_WATER_MARK = 64 * 1024; // 64KB
const BACKPRESSURE_THRESHOLD = HIGH_WATER_MARK / 4; // Resume reading when bufferedAmount falls below this

const wsClient = await initializeWsClient();

let isActive = false;

wsClient.client?.on('message', (message: string) => {
  console.log('Message Recieved', message);
  if (message === 'start') {
    isActive = true;
    console.log('isActive', isActive);
  }
});

// let isActive = false;
// async function processFileLetterByLetter(filePath: string) {
//   return new Promise<void>((resolve, reject) => {
//     const readStream = fs.createReadStream(filePath, {
//       encoding: 'utf8',
//       highWaterMark: HIGH_WATER_MARK,
//     });
//     if (isActive) {
//       setInterval(() => {
//         readStream.on('data', (chunk) => {
//           // Send data only if WebSocket's bufferedAmount is below the threshold
//           if (wsClient.getBufferedAmount() < BACKPRESSURE_THRESHOLD) {
//             // count chars in chunk
//             const charCount = chunk.toString().split('').length;
//             const packet: Packet = {
//               chunk: chunk.toString(),
//               charCount,
//               packetNr,
//             };
//             clientProcess.send({
//               cmd: 'packet',
//               data: { packet: JSON.stringify(packet) },
//             });
//             // console.log(packet.chunk);
//             packetNr++;
//           } else {
//             // Pause reading if we hit the threshold
//             readStream.pause();

//             // Check getBufferedAmount and resume reading when it decreases below threshold
//             const interval = setInterval(() => {
//               if (wsClient.getBufferedAmount() < BACKPRESSURE_THRESHOLD) {
//                 clearInterval(interval);
//                 readStream.resume();
//               }
//             }, 100); // Check every 100ms
//           }
//         });
//       }, 50);

//       readStream.on('end', () => {
//         // console.log(`Finished processing file: ${filePath}`);
//         resolve();
//       });

//       readStream.on('error', (err) => {
//         console.error('Stream error:', err);
//         reject(err);
//       });
//     }
//   });
// }

// async function processFolder(folderPath: string) {
//   const files = await fs.promises.readdir(folderPath);
//   for (const fileName of files) {
//     const filePath = path.join(folderPath, fileName);
//     if (fs.statSync(filePath).isFile()) {
//       // Ensure you're reading files
//       console.log(`Processing file: ${fileName}`);
//       await processFileLetterByLetter(filePath);
//     }
//   }
// }
