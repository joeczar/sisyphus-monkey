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

  for (let i = 0; i < packet.content.length; i++) {
    let boundaryBuffer = '';

    for (
      let j = i;
      j < Math.min(i + MAX_WORD_LENGTH, packet.content.length);
      j++
    ) {
      boundaryBuffer += packet.content[j];

      try {
        if (wordTrie.search(boundaryBuffer.toLowerCase())) {
          const definition = await definitionState.getDefinition(
            boundaryBuffer
          );
          const word = boundaryBuffer;
          if (definition) {
            if (definition === '404') {
              console.error(`${word}: Word does not exist`);
              break;
            }
            definitionState.setDefinition(word, definition);

            const wordNode: WordNode = {
              word,
              packetNr: packet.id,
              position: { start: i, end: j },
              wordNr: wordsState.totalWords,
              chars: word.length,
              definitions: flattenWordDefinitions(definition),
            };

            words.push(wordNode);
          }
        }
      } catch (error) {
        console.error('Error occurred while searching for word:', error);
      }
    }
  }

  return words;
}
