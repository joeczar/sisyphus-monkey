import { getPacket } from '../db/dbService';
import { wordTrie } from '../found-words/trieService';
import { processBoundaryWords } from './processBoundryWords';

export async function pullPacketsForParsing(startingNumber = 0) {
  let currentPacket = await getPacket(startingNumber);
  let nextPacket = await getPacket(startingNumber + 1);

  const packetsToProcess = [];

  while (currentPacket && nextPacket) {
    // Process current and next packet for boundary-spanning words
    // Assuming a function `processBoundaryWords` that handles the logic of finding words spanning boundaries
    processBoundaryWords(currentPacket, nextPacket, wordTrie);

    // Add the current packet to the processing list
    packetsToProcess.push(currentPacket);

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

  return packetsToProcess;
}
