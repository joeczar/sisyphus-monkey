import type { Packet } from '../characters/packet.type';
import type { Trie } from '../found-words/Trie';
import type { WordData } from '../types/wordData';
import type { BoundaryWordData } from '../types/wordData';
import { wordTrie } from '../found-words/trieService';
import https from 'https';
import { getWordPrompt } from '../poems/llm';
import { getDefinitions } from './getDefinitions';
import readline from 'readline';
import {
  addMeaning,
  addMetadata,
  // addMetadata,
  fetchMeaning,
  // generateMetadata,
} from '../langchain/groqMixtral';

const TESTING = true;
const MAX_WORD_LENGTH = 20;
let wordNr = 0;
const trie = wordTrie;

const wordsURL =
  'https://raw.githubusercontent.com/joeczar/english-words/master/words.txt';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function fetchWords(wordsURL: string): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    https
      .get(wordsURL, (response) => {
        let data = '';
        response.on('data', (chunk) => {
          data += chunk;
        });
        response.on('end', () => {
          const words = data.split('\n');
          const lowercase = words.map((word) => word.toLowerCase());
          resolve(lowercase);
        });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

async function fetchWordList() {
  try {
    const response = await fetchWords(wordsURL);
    return new Set(response);
  } catch (error) {
    console.error('Error fetching word list:', error);
    return null;
  }
}

const wordSet = await fetchWordList();

export async function processPackets(packet: Packet) {
  console.log('Processing packet:', packet.id);
  const words: WordData[] = [];

  // check each character in the packet for a word
  for (let i = 0; i < packet.content.length; i++) {
    // Reset boundaryBuffer for each starting character
    let boundaryBuffer = '';

    for (
      let j = i;
      j < Math.min(i + MAX_WORD_LENGTH, packet.content.length);
      j++
    ) {
      boundaryBuffer += packet.content[j]; // Accumulate the next character in the sequence

      try {
        if (trie.search(boundaryBuffer.toLowerCase())) {
          console.log('Found word:', boundaryBuffer);
          const wordData: WordData = {
            word: boundaryBuffer,
            packetNr: packet.id,
            position: { start: i, end: j },
            wordNr: wordNr++,
            chars: boundaryBuffer.length,
          };
          console.log('adding meaning', wordData);
          const withMeaning = await addMeaning(wordData);

          if (!withMeaning) {
            continue;
          }

          const response = addMetadata(withMeaning);
          console.log('added metadata', response);
          words.push(wordData);
          console.log(wordData);
        }
        if (TESTING) {
          await new Promise((resolve) => {
            rl.question('Press Enter to continue...', () => {
              resolve(null);
            });
          });
        } else {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      } catch (error) {
        console.error(`Error searching for word: ${error}`);
      }
    }
  }

  return words;
}

export function processBoundaryWords(
  currentPacket: Packet,
  nextPacket: Packet
) {
  let boundaryBuffer = '';

  // Check the last N characters of the current packet, where N is the maximum word length you expect - 1
  for (
    let i = Math.max(0, currentPacket.content.length - MAX_WORD_LENGTH);
    i < currentPacket.content.length;
    i++
  ) {
    boundaryBuffer += currentPacket.content[i];

    // If boundaryBuffer + the start of the next packet contains a valid word, process it
    for (
      let j = 0;
      j < Math.min(MAX_WORD_LENGTH, nextPacket.content.length);
      j++
    ) {
      let potentialWord =
        boundaryBuffer + nextPacket.content.substring(0, j + 1);
      if (trie.search(potentialWord.toLowerCase())) {
        return {
          word: potentialWord,
          packetNr: currentPacket.id,
          position: { start: i, end: j },
          nextPacketNr: nextPacket.id,
        } as BoundaryWordData;
      }
    }
  }
}
export async function parsePacketBatch(packetBatch: Packet[]) {
  let words: WordData[] = [];
  let boundaryWords: BoundaryWordData[] = [];
  for (let i = 0; i < packetBatch.length; i++) {
    let currentPacket = packetBatch[i];
    let nextPacket = packetBatch[i + 1];

    try {
      if (nextPacket) {
        const result = processBoundaryWords(currentPacket, nextPacket);
        if (result) boundaryWords.push(result);
      }

      const packetWords = await processPackets(currentPacket);
      words.push(...packetWords);
    } catch (error) {
      console.error(`Error processing packet ${i}: ${error}`);
    }
  }
  const result = addBoundaryWordstoWords(words, boundaryWords);
  return result;
}

function addBoundaryWordstoWords(
  words: WordData[],
  boundaryWords: BoundaryWordData[]
) {
  for (let boundaryWord of boundaryWords) {
    words.push({
      word: boundaryWord.word,
      packetNr: boundaryWord.packetNr,
      position: boundaryWord.position,
      wordNr: words[words.length - 1].wordNr + 1.0,
      chars: boundaryWord.word.length,
    });
  }
  return words;
}

// Modify processPackets and processBoundaryWords to use the wordSet for validation

// export function processPackets(packet, wordSet) {
//   const words = [];

//   for (let i = 0; i < packet.content.length; i++) {
//     let boundaryBuffer = "";

//     for (let j = i; j < Math.min(i + MAX_WORD_LENGTH, packet.content.length); j++) {
//       boundaryBuffer += packet.content[j];

//       if (wordSet.has(boundaryBuffer.toLowerCase())) { // Convert to lower case if your word list is in lower case
//         words.push({
//           word: boundaryBuffer,
//           packetNr: packet.id,
//           position: { start: i, end: j },
//         });
//       }
//     }
//   }

//   return words;
// }

// export function processBoundaryWords(currentPacket, nextPacket, wordSet) {

//   for (let i = Math.max(0, currentPacket.content.length - MAX_WORD_LENGTH + 1); i < currentPacket.content.length; i++) {
//     let boundaryBuffer = currentPacket.content.slice(i);

//     for (let j = 0; j < Math.min(MAX_WORD_LENGTH, nextPacket.content.length); j++) {
//       let potentialWord = boundaryBuffer + nextPacket.content[j];

//       if (wordSet.has(potentialWord.toLowerCase())) {
//         return {
//           word: potentialWord,
//           packetNr: currentPacket.id,
//           position: { start: i - currentPacket.content.length, end: j }, // Adjusting the position
//           nextPacketNr: nextPacket.id,
//         };
//       }
//     }
//   }
// }
