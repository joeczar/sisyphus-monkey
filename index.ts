import { wordsSet } from './utils/wordsSet';
import fs from 'fs';
import path from 'path';

const FOLDER_PATH = './generated-letters-chunked';
const WORDS_PATH = './found-words/words.txt';

const MAX_WORD_LENGTH = 10;

function logFoundWord(word: string) {
  fs.appendFileSync(WORDS_PATH, word + ', ');
}

async function processFileLetterByLetter(
  filePath: fs.PathLike,
  wordSet: Set<string>
) {
  return new Promise<void>((resolve, reject) => {
    let buffer = '';
    const readStream = fs.createReadStream(filePath, {
      encoding: 'utf8',
      highWaterMark: 1, // Read 1 byte at a time to process letter by letter
    });

    readStream.on('data', (chunk) => {
      const letter = chunk.toString();
      console.log(letter);
      buffer += letter;

      // Keep the buffer size to MAX_WORD_LENGTH
      if (buffer.length > MAX_WORD_LENGTH) {
        buffer = buffer.substr(-MAX_WORD_LENGTH);
      }

      // Check if the buffer ends with any word in the set
      wordSet.forEach((word: string) => {
        if (buffer.endsWith(word)) {
          // console.log(`Found word: ${word}`);
          logFoundWord(word);
        }
      });
    });

    readStream.on('error', (err) => {
      console.error('Stream error:', err);
      reject(err);
    });

    readStream.on('end', () => {
      console.log(`Finished processing file: ${filePath}`);
      resolve();
    });
  });
}

async function processFolder(folderPath: fs.PathLike, wordSet: Set<string>) {
  try {
    const files = await fs.promises.readdir(folderPath);
    for (const fileName of files) {
      const filePath = path.join(folderPath.toString(), fileName.toString());
      console.log(`Processing file: ${fileName}`);
      await processFileLetterByLetter(filePath, wordSet);
    }
    console.log('Finished processing all files in the folder.');
  } catch (error) {
    console.error('Error processing folder:', error);
  }
}

// Execute the function to process all files in the specified folder
processFolder(FOLDER_PATH, wordsSet);
