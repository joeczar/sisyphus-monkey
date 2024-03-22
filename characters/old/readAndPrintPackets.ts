import fs from 'fs/promises';
import path from 'path';

const folderPath = '../generated-letters-chunked'; // Replace with the actual folder path

const consoleWidth = process.stdout.columns;

function splitIntoChunks(text: string, chunkSize: number) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}

async function readAndPrintFile(filePath: string) {
  try {
    const data = await fs.readFile(filePath, 'utf8');

    // Split the whole file into chunks instead of lines to display in chunks with the width of the console
    const chunks = splitIntoChunks(data, consoleWidth);
    for (const chunk of chunks) {
      console.log(chunk);
      await new Promise((resolve) => setTimeout(resolve, 100)); // Print the next chunk after a delay
    }
  } catch (err) {
    console.error('Error reading file:', err);
  }
}

async function processFilesSequentially(folderPath: string) {
  try {
    const files = await fs.readdir(folderPath);
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      await readAndPrintFile(filePath); // Wait for this file's chunks to be processed before moving on to the next file
    }
  } catch (err) {
    console.error('Error reading folder:', err);
  }
}

processFilesSequentially(folderPath);
