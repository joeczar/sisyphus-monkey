import { getPacket } from '../db/dbService';
import { wordTrie } from '../found-words/trieService';
import { processBoundaryWords } from './processBoundryWords';
import { processPackets } from './processPackets';

export async function pullPacketsForParsing(startingNumber = 0) {
  let startingPacket = startingNumber;
  let currentPacket = await getPacket(startingPacket);
  let nextPacket = await getPacket(startingPacket + 1);

  const packetsToProcess = [];
  const foundWords = [];

  while (currentPacket && nextPacket) {
    // Process current and next packet for boundary-spanning words

    const boundaryWord = processBoundaryWords(
      currentPacket,
      nextPacket,
      wordTrie
    );
    if (boundaryWord) {
      foundWords.push(boundaryWord);
    }

    // Add the current packet to the processing list
    packetsToProcess.push(currentPacket);

    packetsToProcess.forEach(async (packet) => {
      const words = await processPackets(packet, wordTrie);
      foundWords.push(...words);
    });

    // Advance the packets window
    currentPacket = nextPacket;
    nextPacket = await getPacket(currentPacket.packetNr + 1);

    // Optional: Break condition if there's a specific termination logic,
    // such as a maximum number of packets to process or other criteria
  }

  // Handle the last packet if there's any logic needed
  if (currentPacket) {
    packetsToProcess.push(currentPacket);
    // Any special handling for the last packet could go here
  }
  return foundWords;
}
