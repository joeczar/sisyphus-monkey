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
import { state } from '../state/stateManager';
import { neo4jDb } from '../db/Neo4jWordData';
import { validateWordData } from '../utils/validateWordData';

const MAX_WORD_LENGTH = 20;
let wordNr = 0;
const trie = wordTrie;
const wordDataArray: WordData[] = [];
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
    return response;
  } catch (error) {
    console.error('Error fetching word list:', error);
    return null;
  }
}
const wordList = await fetchWordList();
async function loadAndFilterWords() {
  const singleLetterWords = ['a', 'i', 'o', 'u', 'k'];
  const filteredWordList = wordList?.filter((word) => {
    if (word.length < 2) {
      return singleLetterWords.includes(word);
    }
    return true; // Keep words longer than one letter
  });
  const wordSet = new Set(filteredWordList);

  return wordSet;
}

export async function processPackets(packet: Packet) {
  state.addPacket(packet);

  // const wordSet = await loadAndFilterWords();
  let words: WordData[] = [];

  for (let i = 0; i < packet.content.length; i++) {
    let boundaryBuffer = '';

    for (
      let j = i;
      j < Math.min(i + MAX_WORD_LENGTH, packet.content.length);
      j++
    ) {
      boundaryBuffer += packet.content[j];

      if (trie.search(boundaryBuffer.toLowerCase())) {
        const hasWord = await PacketChannelService.getWord(boundaryBuffer);

        if (hasWord) {
          if (hasWord === 'trash') {
            console.log('Word is trash:', boundaryBuffer);
            break;
          }
          console.log('Word already in Redis:', boundaryBuffer);
          const wordData: WordData = {
            ...hasWord,
            packetNr: packet.id,
            position: { start: i, end: j },
            wordNr: wordNr++,
            chars: boundaryBuffer.length,
          };
          state.lastWord = { number: wordData.wordNr, word: wordData.word };
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
            state.lastWord = { number: response.wordNr, word: response.word };
            words.push(response);
          }
        }
        break;
      }
      const result = await insertToNeo4j(words);
      if (result) {
        words = [];
      }
    }
  }

  return words;
}

const insertToNeo4j = async (wordDataList: WordData[]) => {
  try {
    if (wordDataList.length < 50) {
      return false;
    }
    console.log('Inserting to Neo4j:', wordDataList.length);
    const results = validateWordData(wordDataList);
    console.log(
      'Results good:',
      results.good.length,
      'Bad',
      results.bad.length,
      results.bad
    );
    if (results.bad.length) {
      console.error('Incomplete data:', results.bad);
      throw new Error('Incomplete data');
    }
    await neo4jDb.insertWordData(wordDataList);
    await neo4jDb.createIndexes();
    await neo4jDb.createWordOrderConnections();
    // const words = await neo4jDb.createWordNodes(wordDataList);
    // const meanings = await neo4jDb.createMeaningRelationships(wordDataList);
    // const metadata = await neo4jDb.createMetadataRelationships(wordDataList);
    wordDataList = [];
    return true;
  } catch (error) {
    console.error('Error inserting to Neo4j:', error);

    throw error;
  }
};

async function prepareForGraph(response: WordData) {
  const { word } = response;
  try {
    const definition = await getDefinition(word);

    if (!definition) {
      return;
    }
    const withMeaning = {
      ...response,
      meaning: definition[0].meanings,
    };
    if (withMeaning.meaning) {
      const complete = await addMetadata(withMeaning);
      if (complete && complete.meaning && complete.metadata) return complete;
    }
    const trash = {
      ...response,
      trash: true,
    };
    await PacketChannelService.setWord(word, trash);
  } catch (error) {
    console.error('Error fetching definition:', error);
  }
}

export async function processBoundaryWords(
  currentPacket: Packet,
  nextPacket: Packet
) {
  const wordSet = await loadAndFilterWords();
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
          if (hasWord === 'trash') {
            console.log('Word is trash:', boundaryBuffer);
            break;
          }
          const parsed = hasWord;
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
  await insertToNeo4j(words);
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
