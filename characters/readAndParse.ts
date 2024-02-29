import fs from "fs";
import path from "path";
import type { Packet } from "./packet.type";
import { DatabaseService } from "../db/database";
// import { parsePacketBatch } from "../words/processPackets";

const FOLDER_PATH = "./generated-letters-chunked";

const HIGH_WATER_MARK = 16 * 1024;
const TARGET_CHAR_COUNT = 42000;
let currentBuffer = "";
let packetNr = 0;

async function processFileLetterByLetter(filePath: string) {
  console.log("Processing file:", filePath);
  return new Promise<void>(async (resolve, reject) => {
    const readStream = fs.createReadStream(filePath, {
      encoding: "utf8",
      highWaterMark: HIGH_WATER_MARK,
    });

    // Initialize an array to batch packets
    const packetBatch: Packet[] = [];
    const BATCH_SIZE = 50; // Size of the batch to be inserted

    readStream.on("data", async (chunk) => {
      readStream.pause();
      currentBuffer += chunk;
      while (currentBuffer.length >= TARGET_CHAR_COUNT) {
        // When the currentBuffer has enough characters, add a packet to the batch
        let packetChunk = currentBuffer.substring(0, TARGET_CHAR_COUNT);

        const packet: Packet = {
          chunk: packetChunk,
          charCount: packetChunk.length,
          packetNr,
        };

        packetBatch.push(packet); // Add to the batch

        // Check if the batch is ready to be inserted
        if (packetBatch.length >= BATCH_SIZE) {
          // Insert batch and reinitialize packetBatch array
          await DatabaseService.enqueuePackets(packetBatch);
          // const words = await parsePacketBatch(packetBatch);
          // Clear the batch
          packetBatch.length = 0;
        }

        packetNr++;
        // Remove processed characters from the currentBuffer
        currentBuffer = currentBuffer.substring(TARGET_CHAR_COUNT);
        setTimeout(() => readStream.resume(), 500);
      }
    });

    readStream.on("end", async () => {
      if (currentBuffer.length > 0) {
        // Handle the last remaining buffer
        const packet: Packet = {
          chunk: currentBuffer,
          charCount: currentBuffer.length,
          packetNr,
        };
        packetBatch.push(packet);
      }

      // Insert any remaining packets in the last batch
      if (packetBatch.length > 0) {
        await DatabaseService.enqueuePackets(packetBatch);
        // const words = await parsePacketBatch(packetBatch);
      }

      resolve();
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
