import { type WordNode } from './../types/wordNode';
import type { Packet } from '../characters/packet.type';
import { packetService } from '../db/neo4j/PacketService';
import { wordsState } from '../state/WordsState';
import { wordTrie } from '../found-words/trieService';
import { flattenWordDefinitions } from '../poems/utils/definitionUtils';
import { definitionState } from '../state/DefinitionState';
import type { FlattenedWordDefinition } from '../types/ApiDefinition';
import util from 'util';
import os from 'os';

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
  // let words: WordNode[] = [];
  const batchLength = 50;
  const potentialWords = parseWords(packet);
  console.log('Potential words:', potentialWords.length);

  // break up the potential words into batches
  for (let i = 0; i < potentialWords.length; i += batchLength) {
    console.log('Processing batch:', i);
    const batchWords: WordNode[] = [];
    const batch = potentialWords.slice(i, i + batchLength);
    console.log(
      `Processing batch: ${i}, Memory Usage: ${util.inspect(
        process.memoryUsage()
      )}`
    );
    console.log(
      `System Free Memory: ${os.freemem()} bytes, System Total Memory: ${os.totalmem()} bytes`
    );

    const definitionPromises = batch.map((pWord) =>
      definitionState
        .getDefinition(pWord.word)
        .then((definition) => ({ ...pWord, definition }))
    );
    const results = await Promise.allSettled(definitionPromises);
    for (const result of results) {
      if (
        result.status === 'fulfilled' &&
        result.value.definition &&
        result.value.definition !== '404'
      ) {
        const { word, start, end, definition } = result.value;
        await definitionState.setDefinition(word, definition);
        console.log('Definition:', definition);
        const wordNode: WordNode = {
          word,
          packetNr: packet.id,
          position: { start, end },
          wordNr: wordsState.totalWords,
          chars: word.length,
          definitions: flattenWordDefinitions(definition),
        };
        batchWords.push(wordNode);
      }
    }
    if (!batchWords.length) {
      continue;
    }
    await wordsState.setWordsForProcessing(batchWords);
  }
}

function parseWords(packet: Packet) {
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
