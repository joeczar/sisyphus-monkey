import fs from 'fs/promises';
import path from 'path';

const folderPath = '../generated-letters-chunked'; // Replace with the actual folder path

async function readAndPrintFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const lines = data.split('\n');
    for (let i = 0; i < lines.length; i++) {
      console.log(lines[i]);
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait for 3 seconds before printing the next line
    }
  } catch (err) {
    console.error('Error reading file:', err);
  }
}

async function processFilesSequentially(folderPath) {
  try {
    const files = await fs.readdir(folderPath);
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      await readAndPrintFile(filePath); // Wait for this file's lines to be processed before moving on to the next file
    }
  } catch (err) {
    console.error('Error reading folder:', err);
  }
}

processFilesSequentially(folderPath);
