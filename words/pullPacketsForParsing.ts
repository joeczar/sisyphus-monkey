import { getPacket } from '../db/dbService';
import { wordTrie } from '../found-words/trieService';
import { processBoundaryWords } from './processBoundryWords';
import { processPackets } from './processPackets';

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


export async function pullPacketsForParsing(startingNumber = 0) {
  let currentPacket = await getPacket(startingNumber);
  let nextPacket = await getPacket(startingNumber + 1);

  const foundWords = [];
  const retryLimit = 5; // Maximum number of retries
  let retries = 0; // Current retry count

  while (currentPacket) {
    const words = await processPackets(currentPacket, wordTrie);
    foundWords.push(...words);

    if (!nextPacket && retries < retryLimit) {
      await delay(1000); // Wait for 1 second (or however long you deem appropriate)
      nextPacket = await getPacket(currentPacket.packetNr + 1);
      retries++;
      continue; // Skip the rest of the loop to try fetching the next packet again
    }

    // Reset retry count if we successfully get a packet
    retries = 0;

    // Process boundary words and advance to the next packet as usual
    if (nextPacket) {
      const boundaryWord = processBoundaryWords(currentPacket, nextPacket, wordTrie);
      if (boundaryWord) {
        foundWords.push(boundaryWord);
      }

      currentPacket = nextPacket;
      nextPacket = await getPacket(currentPacket.packetNr + 1);
    } else {
      // Exit the loop if no next packet is found after retries
      break;
    }
  }

  return foundWords;
}


