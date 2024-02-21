import fs from 'fs';
import path from 'path';

const FOLDER_PATH = '../generated-letters';
const GOAL_PATH = '../generated-letters-chunked';
const CHUNK_SIZE = 1024 * 1024;

async function chunkFile(filePath: string, chunkSize: number) {
  return new Promise((resolve, reject) => {
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
        `${fileNameArr[0]}-chunk-${partNumber}.${fileNameArr[1]}`
      );
      fs.writeFileSync(partFilePath, chunk);
    });

    readStream.on('error', reject);

    readStream.on('end', resolve);
  });
}

async function chunkFolder(folderPath: string, chunkSize: number) {
  try {
    const files = await fs.promises.readdir(folderPath);

    for (const fileName of files) {
      const filePath = path.join(folderPath, fileName);
      await chunkFile(filePath, chunkSize);
    }

    console.log('Finished processing all files in the folder.');
  } catch (error) {
    console.error('Error processing folder:', error);
  }
}

// Execute the function to chunk all files in the specified folder
chunkFolder(FOLDER_PATH, CHUNK_SIZE);
