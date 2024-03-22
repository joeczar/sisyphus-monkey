import fs from 'fs';
import path from 'path';
import type { Packet } from '../packet.type';
import { sleep } from '../../utils/sleep';
import { Transform } from 'stream';
import { DatabaseService } from '../../db/database';

const FOLDER_PATH = './generated-letters-chunked';

const HIGH_WATER_MARK = 16 * 1024;
const TARGET_CHAR_COUNT = 42000;
const BATCH_SIZE = 20;
let packetNr = 0;

function createPacketTransformStream(
  fileName: string,
  batchSize: number,
  targetCharCount: number
) {
  let buffer = '';

  let packetBatch: Packet[] = [];

  return new Transform({
    objectMode: true,
    async transform(chunk, encoding, callback) {
      buffer += chunk.toString();
      try {
        while (buffer.length >= targetCharCount) {
          let content = buffer.substring(0, targetCharCount);
          buffer = buffer.substring(targetCharCount);
          const timestamp = new Date();
          let packet: Packet = {
            content,
            id: packetNr++,
            charCount: content.length,
            timestamp,
            source: fileName,
          };
          console.log('Packet:', packet.id);
          packetBatch.push(packet);

          if (packetBatch.length >= batchSize) {
            await DatabaseService.enqueuePackets(packetBatch);
            await sleep(3000);
            packetBatch = [];
          }
        }

        callback();
      } catch (error) {
        callback(error as Error);
      }
    },
    async flush(callback) {
      try {
        if (packetBatch.length > 0) {
          await DatabaseService.enqueuePackets(packetBatch);
          await sleep(3000);
        }
        callback();
      } catch (error) {
        callback(error as Error);
      }
    },
  });
}

async function processFileLetterByLetter(filePath: string) {
  console.log('Processing file:', filePath);
  return new Promise<void>(async (resolve, reject) => {
    const readStream = fs.createReadStream(filePath, {
      encoding: 'utf8',
      highWaterMark: HIGH_WATER_MARK,
    });

    readStream
      .pipe(
        createPacketTransformStream(filePath, BATCH_SIZE, TARGET_CHAR_COUNT)
      )
      .on('error', (err) => {
        console.error('Error in transformation stream:', err);
        reject(err);
      })
      .on('finish', () => {
        console.log('File processing completed for:', filePath);
        resolve();
      });

    readStream.on('error', (err) => {
      console.error('Stream error:', err);
      reject(err);
    });
  });
}

export async function processFolder(folderPath: string = FOLDER_PATH) {
  console.log('Processing data:', folderPath);
  const files = await fs.promises.readdir(folderPath);

  // Create an array of promises
  const processingPromises = files
    .map((fileName) => {
      const filePath = path.join(folderPath, fileName);
      if (fs.statSync(filePath).isFile()) {
        return processFileLetterByLetter(filePath); // Return the promise
      }
    })
    .filter(Boolean); // Filter out any undefined entries

  // Wait for all file processing to complete
  await Promise.all(processingPromises);
}
