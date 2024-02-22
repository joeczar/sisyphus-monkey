import fs from 'fs';
import path from 'path';
import WebSocket from 'ws';

const wsServers = {
  word: "ws://192.168.178.138:8080",
  mac: 'ws://192.168.178.126:8080'
}

const FOLDER_PATH = path.resolve(__dirname, '../generated-letters-chunked');

const ws = new WebSocket(wsServers.word);

// Thresholds for backpressure handling
const HIGH_WATER_MARK =  64 * 1024; // 64KB
const BACKPRESSURE_THRESHOLD = HIGH_WATER_MARK / 4; // Resume reading when bufferedAmount falls below this

ws.on('open', function open() {
  console.log('Connected to the server.');
  processFolder(FOLDER_PATH).then(() => {
    console.log('All files processed.');
    ws.close();
  });
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
});

async function processFileLetterByLetter(filePath: string) {
  return new Promise<void>((resolve, reject) => {
    const readStream = fs.createReadStream(filePath, { encoding: 'utf8', highWaterMark: HIGH_WATER_MARK });

    setInterval(()=>{
      readStream.on('data', (chunk) => {
        // Send data only if WebSocket's bufferedAmount is below the threshold
        if (ws.bufferedAmount < BACKPRESSURE_THRESHOLD) {
          ws.send(chunk.toString());
          console.log(chunk)
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
    }, 50)
    

    readStream.on('end', () => {
      // console.log(`Finished processing file: ${filePath}`);
      resolve();
    });

    readStream.on('error', (err) => {
      console.error('Stream error:', err);
      reject(err);
    });
  });
}

async function processFolder(folderPath: string) {
  const files = await fs.promises.readdir(folderPath);
  for (const fileName of files) {
    const filePath = path.join(folderPath, fileName);
    if (fs.statSync(filePath).isFile()) { // Ensure you're reading files
      console.log(`Processing file: ${fileName}`);
      await processFileLetterByLetter(filePath);
    }
  }
}
