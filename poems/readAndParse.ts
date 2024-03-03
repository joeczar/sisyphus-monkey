import fs from "fs";
import path from "path";
import type { Packet } from "../db/Neo4jDb";

import { Transform } from 'stream';
import neo4jDb from "../db/Neo4jDb";

const FOLDER_PATH = "./generated-letters-chunked";

const HIGH_WATER_MARK = 16 * 1024;
const TARGET_CHAR_COUNT = 42000;
const BATCH_SIZE = 20; 


function createPacketTransformStream(fileName: string, batchSize: number, targetCharCount: number) {
  let buffer = '';
  let packetNr = 0;
  let packetBatch: Packet[] = [];

  return new Transform({
    objectMode: true,
    async transform(chunk, encoding, callback) {
      buffer += chunk.toString();
      try {

        while (buffer.length >= targetCharCount) {
          let packetChunk = buffer.substring(0, targetCharCount);
          buffer = buffer.substring(targetCharCount);
          const timestamp = new Date()
          let packet: Packet = { content: packetChunk, id:packetNr, timestamp, source: fileName };
          packetNr++;
          packetBatch.push(packet);
          
          if (packetBatch.length >= batchSize) {
            await neo4jDb.batchPackets(packetBatch);
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
          await neo4jDb.batchPackets(packetBatch);
        }
        callback();
      } catch (error) {
        callback(error as Error);
      }
    }
  });
}



async function processFileLetterByLetter(filePath: string) {
  console.log("Processing file:", filePath);
  return new Promise<void>(async (resolve, reject) => {
    const readStream = fs.createReadStream(filePath, {
      encoding: "utf8",
      highWaterMark: HIGH_WATER_MARK,
    });

    
    readStream.pipe(createPacketTransformStream(filePath, BATCH_SIZE, TARGET_CHAR_COUNT)).on('finish', () => {
      console.log('All data has been processed');
    });

    readStream.on("error", (err) => {
      console.error("Stream error:", err);
      reject(err);
    });
  });
}

export async function processFolder(folderPath: string = FOLDER_PATH) {
  console.log("Processing data:", folderPath);
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
