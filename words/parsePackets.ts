import type { Packet } from '../characters/packet.type';
import { packetService } from '../db/neo4j/PacketService';
import { wordsState } from '../state/WordsState';
import { wordTrie } from '../found-words/trieService';
import type { WordNode } from '../types/wordNode';
import { flattenWordDefinitions } from '../poems/utils/definitionUtils';
import { definitionState } from '../state/DefinitionState';
import type { FlattenedWordDefinition } from '../types/ApiDefinition';

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
        const wordNodes = await parsePacket(packet);
        console.log('Word nodes:', wordNodes.length, wordNodes[0]);
        await wordsState.setWordsForProcessing(wordNodes);
      } catch (error) {
        console.error('Error occurred while parsing packet:', error);
      }
    }
    wordsState.addToPacketsProcessed(packets.length);
  } catch (error) {
    console.error('Error occurred while getting packets:', error);
  }
};

export async function parsePacket(packet: Packet): Promise<WordNode[]> {
  let words: WordNode[] = [];
  let redisArray: WordNode[] = [];
  const batchLength = 100;
  const potentialWords = parseWords(packet);

  // Then, look up all definitions in parallel
  const definitionPromises = potentialWords.map((pWord) =>
    definitionState
      .getDefinition(pWord.word)
      .then((definition) => ({ ...pWord, definition }))
  );
  const results = await Promise.allSettled(definitionPromises);

  results.forEach((result) => {
    if (
      result.status === 'fulfilled' &&
      result.value.definition &&
      result.value.definition !== '404'
    ) {
      const { word, start, end, definition } = result.value;
      definitionState.setDefinition(word, definition);

      const wordNode: WordNode = {
        word,
        packetNr: packet.id,
        position: { start, end },
        wordNr: wordsState.totalWords,
        chars: word.length,
        definitions: flattenWordDefinitions(definition),
      };
      words.push(wordNode);
      redisArray.push(wordNode);
      if (redisArray.length === batchLength) {
        wordsState.setWordsForProcessing(redisArray);
        redisArray = [];
      }
      console.log('words Processed in batch:', words.length);
    }
  });
  wordsState.setWordsForProcessing(redisArray);
  return words;
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
