import type { Packet } from '../characters/packet.type';
import type { Trie } from '../found-words/Trie';
import type { WordData, WordDefinition } from '../types/wordData';
import type { BoundaryWordData } from '../types/wordData';
import { wordTrie } from '../found-words/trieService';
import https from 'https';
import { getWordPrompt } from '../poems/llm';
import readline from 'readline';
import { addMetadata } from '../langchain/groqMixtral';
import { PacketChannelService } from './RedisWordService';
import { addMeaning, getDefinition } from './getDefinitions';

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
const wordList = fetchWordList();

export async function processPackets(packet: Packet) {
  console.log('Processing packet:', packet.id);
  const words: WordData[] = [];

  for (let i = 0; i < packet.content.length; i++) {
    let boundaryBuffer = '';

    for (
      let j = i;
      j < Math.min(i + MAX_WORD_LENGTH, packet.content.length);
      j++
    ) {
      boundaryBuffer += packet.content[j];

      if (trie.search(boundaryBuffer.toLowerCase())) {
        console.log('Found word:', boundaryBuffer);
        const hasWord = await PacketChannelService.getWord(boundaryBuffer);

        if (hasWord) {
          const parsed = JSON.parse(hasWord) as WordData;
          console.log('Word already in Redis:', boundaryBuffer);
          const wordData: WordData = {
            ...parsed,
            packetNr: packet.id,
            position: { start: i, end: j },
            wordNr: wordNr++,
            chars: boundaryBuffer.length,
          };
          words.push(wordData);
        } else {
          const wordData: WordData = {
            word: boundaryBuffer,
            packetNr: packet.id,
            position: { start: i, end: j },
            wordNr: wordNr++,
            chars: boundaryBuffer.length,
          };
          const response = await prepareForGraph(wordData);
          if (response) {
            await PacketChannelService.setWord(boundaryBuffer, response);
            words.push(response);
          }
        }
        break;
      }
    }
  }

  return words;
}
async function prepareForGraph(response: WordData) {
  const { word } = response;
  try {
    const definition: WordDefinition = await getDefinition(word);

    if (!definition) {
      console.log('No definition found for:', word);
      return;
    }
    const withMeaning = {
      ...response,
      meaning: definition.meanings,
    };
    const complete = await addMetadata(withMeaning);
    console.log({ complete });
    return complete;
  } catch (error) {
    console.error('Error fetching definition:', error);
  }
}

export async function processBoundaryWords(
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
        const hasWord = await PacketChannelService.getWord(boundaryBuffer);

        if (hasWord) {
          const parsed = JSON.parse(hasWord) as WordData;
          console.log('Word already in Redis:', boundaryBuffer);
          const wordData: BoundaryWordData = {
            ...parsed,
            packetNr: currentPacket.id,
            position: { start: i, end: j },
            wordNr: wordNr++,
            chars: boundaryBuffer.length,
            nextPacketNr: nextPacket.id,
          };
          return wordData;
        } else {
          const boundaryWord = {
            word: potentialWord,
            packetNr: currentPacket.id,
            position: { start: i, end: j },
            nextPacketNr: nextPacket.id,
          } as BoundaryWordData;

          return (await prepareForGraph(boundaryWord)) as BoundaryWordData;
        }
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
        const result = await processBoundaryWords(currentPacket, nextPacket);
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
