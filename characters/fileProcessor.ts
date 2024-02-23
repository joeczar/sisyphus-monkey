// fileProcessor.ts
import fs from 'fs';
import path from 'path';
import { WSConnectionManager } from './wsConnectionManager';
import type { Packet } from './packet.type';

export async function processFileLetterByLetter(
  filePath: string,
  wsManager: WSConnectionManager,
  packetNr: number,
  highWaterMark: number,
  backPressureThreshold: number
): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const readStream = fs.createReadStream(filePath, {
      encoding: 'utf8',
      highWaterMark,
    });

    readStream.on('data', (chunk) => {
      if (wsManager.ws && wsManager.ws.bufferedAmount < backPressureThreshold) {
        const charCount = chunk.length;
        const packet: Packet = { chunk: chunk.toString(), charCount, packetNr };
        wsManager.send(JSON.stringify(packet));
        packetNr++;
      } else {
        readStream.pause();
        const checkBufferedAmount = setInterval(() => {
          if (
            wsManager.ws &&
            wsManager.ws.bufferedAmount < backPressureThreshold
          ) {
            clearInterval(checkBufferedAmount);
            readStream.resume();
          }
        }, 100);
      }
    });

    readStream.on('end', () => {
      resolve(packetNr);
    });

    readStream.on('error', (err) => {
      console.error(`Error reading file ${filePath}: ${err}`);
      reject(err);
    });
  });
}

export async function processFolder(
  folderPath: string,
  wsManager: WSConnectionManager
): Promise<void> {
  const files = await fs.promises.readdir(folderPath);
  let packetNr = 0;
  for (const fileName of files) {
    const filePath = path.join(folderPath, fileName);
    if (fs.statSync(filePath).isFile()) {
      console.log(`Processing file: ${fileName}`);
      packetNr = await processFileLetterByLetter(
        filePath,
        wsManager,
        packetNr,
        64 * 1024,
        16 * 1024
      );
    }
  }
  console.log('All files processed.');
  wsManager.close();
}
