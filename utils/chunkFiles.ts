import type { Packet } from './../characters/packet.type';
import fs from 'fs';
import path from 'path';

const FOLDER_PATH = '../generated-letters';
const GOAL_PATH = '../generated-letters-chunked';
const CHUNK_SIZE = 41 * 1024;
let chunkNr = 0;

async function chunkFile(
  filePath: string,
  fileOrder: number,
  chunkSize: number,
  chunkNrBase: number
) {
  return new Promise<number>((resolve, reject) => {
    // Promise now resolves with the new base chunk number
    const fileName = path.basename(filePath);
    let partNumber = 0;

    const readStream = fs.createReadStream(filePath, {
      highWaterMark: chunkSize,
    });

    readStream.on('data', function (chunk: string | Buffer) {
      partNumber++;
      const fileNameArr = fileName.split('.');
      const partFilePath = path.join(
        GOAL_PATH,
        `${fileNameArr[0]}-chunk-${partNumber}.json`
      );
      const Packet: Packet = {
        id: chunkNrBase + fileOrder * CHUNK_SIZE + partNumber,
        content: chunk.toString(),
        charCount: chunk.toString().length,
        source: fileName,
        timestamp: new Date(),
      };

      fs.writeFileSync(partFilePath, JSON.stringify(Packet));
    });

    readStream.on('error', reject);

    readStream.on('end', function () {
      resolve(chunkNrBase + 1000); // Increment the base chunk number by 1000 for the next file
    });
  });
}
async function chunkFolder(folderPath: string, chunkSize: number) {
  try {
    let files = await fs.promises.readdir(folderPath);
    // Sort files by the numeric part at the beginning of the filenames
    files.sort((a, b) => {
      const numA = parseInt(a.split('_')[0], 10);
      const numB = parseInt(b.split('_')[0], 10);
      return numA - numB;
    });

    let chunkNrBase = 0; // This will hold the base for the chunk number
    for (const fileName of files) {
      const filePath = path.join(folderPath, fileName);
      const fileOrder = parseInt(fileName.split('_')[0], 10);
      chunkNrBase = await chunkFile(
        filePath,
        fileOrder,
        chunkSize,
        chunkNrBase
      );
    }

    console.log('Finished processing all files in the folder.');
  } catch (error) {
    console.error('Error processing folder:', error);
  }
}

// async function chunkFile(filePath: string, chunkSize: number) {
//   return new Promise((resolve, reject) => {
//     const fileName = path.basename(filePath);
//     let partNumber = 0;
//     const readStream = fs.createReadStream(filePath, {
//       highWaterMark: chunkSize,
//     });

//     readStream.on('data', function (chunk: string | Buffer) {
//       partNumber++;
//       const fileNameArr = fileName.split('.');
//       const partFilePath = path.join(
//         GOAL_PATH,
//         `${fileNameArr[0]}-chunk-${partNumber}.json`
//       );
//       const Packet: Packet = {
//         id: chunkNr,
//         content: chunk.toString(),
//         charCount: chunk.toString().length,
//         source: fileName,
//         timestamp: new Date(),
//       };
//       chunkNr++;
//       fs.writeFileSync(partFilePath, JSON.stringify(Packet));
//     });

//     readStream.on('error', reject);

//     readStream.on('end', resolve);
//   });
// }

// async function chunkFolder(folderPath: string, chunkSize: number) {
//   try {
//     const files = await fs.promises.readdir(folderPath);

//     for (const fileName of files) {
//       const filePath = path.join(folderPath, fileName);
//       await chunkFile(filePath, chunkSize);
//     }

//     console.log('Finished processing all files in the folder.');
//   } catch (error) {
//     console.error('Error processing folder:', error);
//   }
// }

// Execute the function to chunk all files in the specified folder
chunkFolder(FOLDER_PATH, CHUNK_SIZE);
