import { getPacket } from '../db/dbService';
import { wordTrie } from '../found-words/trieService';
import serverProcess from '../websockets/serverProcess';     
import poemsClient from '../websockets/wsTestPoem';
import { processPackets } from './processPackets';
import { processBoundaryWords } from './processBoundryWords';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let isActive = true; // Control flag to manage the processing state

export async function pullPacketsForParsing(startingNumber = 0) {
  let currentPacket = await getPacket(startingNumber);

  // Wait indefinitely for the first packet if not immediately available
  while (!currentPacket && isActive) {
    await delay(100); // Check again after a delay
    currentPacket = await getPacket(startingNumber);
  }

  let nextPacketNumber = startingNumber + 1;

  while (isActive) {
    if (currentPacket) {
      try {
        
        const words = await processPackets(currentPacket, wordTrie);
        console.log("Words",words.length)
        const wordsPacket = {
          packetNr: currentPacket.packetNr,
          charCount: currentPacket.charCount,
          words
        }
        const messageToSend = {
          cmd: 'sendToClient',
          clientId: 'poem',
          data: { wordsPacket }
        };
        
        serverProcess.send(messageToSend)
      // console.log( "foundWords",words)

        // Prepare for the next packet
        nextPacketNumber = currentPacket.packetNr + 1;
      } catch (error) {
        console.error('pullPacketsForParsing - problem finding word', error);
      }
    }

    let nextPacket = await getPacket(nextPacketNumber);
    const boundaryWords = processBoundaryWords(currentPacket, nextPacket, wordTrie)
    serverProcess.send({
      cmd: 'sendToClient',
          clientId: 'poem',
          data: { wordsPacket: boundaryWords }
    })
    // Wait indefinitely for the next packet if it's not available
    while (!nextPacket && isActive) {
      await delay(100); // Wait before trying again
      nextPacket = await getPacket(nextPacketNumber);
    }

    if (!isActive) {
      break; // Exit if processing is no longer active
    }

    // Move to the next packet
    currentPacket = nextPacket;
  }
}
