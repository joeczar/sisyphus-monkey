import { type WordNode } from './../types/wordNode';
import type { Packet } from '../characters/packet.type';
import { packetService } from '../db/neo4j/PacketService';
import { wordsState } from '../state/WordsState';
import { wordTrie } from '../found-words/trieService';
import { flattenWordDefinitions } from '../poems/utils/definitionUtils';
import { definitionState } from '../state/DefinitionState';
import type { FlattenedWordDefinition } from '../types/ApiDefinition';
import { Semaphore } from '../utils/semaphore';
import util from 'util';
import os from 'os';
import { delay } from '../utils/delay';
import { wordNodeService } from '../db/neo4j/WordNodeService';

const semaphore = new Semaphore(1); // Adjust based on performance observations

const MAX_WORD_LENGTH = 20;

export const handlePackets = async () => {
  console.log('Starting packet processing...');

  let continueProcessing = true;
  while (continueProcessing) {
    const packetsProcessed = wordsState.state.packetsProcessed;
    const packetCount = await packetService.getPacketCount();
    console.log('Packet count:', packetCount);
    if (packetCount && packetsProcessed < packetCount) {
      console.log(
        `Processing packets. Processed: ${packetsProcessed}, Total: ${packetCount}`
      );

      await processPackets(50, packetsProcessed); // Assume this function
    } else {
      console.log('No new packets to process. Waiting for new packets...');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    continueProcessing = !wordsState.state.isFinishedWithWords;
  }
};

export const processPackets = async (batchSize: number, offset: number) => {
  console.log('Processing packets:', batchSize, offset);
  try {
    const packets = await packetService.getPackets(batchSize, offset);
    console.log('Packets:', packets.length);
    for (const packet of packets) {
      try {
        await parsePacket(packet);
      } catch (error) {
        console.error('Error occurred while parsing packet:', error);
      }
    }
    wordsState.addToPacketsProcessed(packets.length);
  } catch (error) {
    console.error('Error occurred while getting packets:', error);
  }
};

async function parsePacket(packet: Packet) {
  const potentialWords = parseWords(packet);

  // Process each word sequentially
  const processedWords: WordNode[] = [];
  for (const word of potentialWords) {
    if (!word.word) {
      continue; // Skip if the word is undefined
    }
  }

  if (processedWords.length > 0) {
    await wordNodeService.createWordNodes(processedWords);
    await wordsState.setWordsForProcessing(processedWords);
  }
}

function parseWords(packet: Packet): Partial<WordNode>[] {
  let potentialWords: { word: string; start: number; end: number }[] = [];

  // First, collect all potential words without doing async work
  for (let i = 0; i < packet.content.length; i++) {
    let boundaryBuffer = '';

    for (
      let j = i;
      j < Math.min(i + MAX_WORD_LENGTH, packet.content.length);
      j++
    ) {
      boundaryBuffer += packet.content[j];
      if (wordTrie.search(boundaryBuffer.toLowerCase())) {
        potentialWords.push({ word: boundaryBuffer, start: i, end: j });
      }
    }
  }
  return potentialWords;
}
