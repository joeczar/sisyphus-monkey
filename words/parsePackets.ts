import { type Packet } from './../characters/packet.type';
import { packetService } from '../db/neo4j/PacketService';
import { wordsState } from '../state/WordsState';
import { wordTrie } from '../found-words/trieService';
import type { WordNode } from '../types/wordNode';
import { flattenWordDefinitions } from '../poems/utils/definitionUtils';
import { definitionState } from '../state/DefinitionState';
import type { FlattenedWordDefinition } from '../types/ApiDefinition';
import { wordNodeService } from '../db/neo4j/WordNodeService';

const MAX_WORD_LENGTH = 20;

export const handlePackets = async () => {
  console.log('Starting packet processing...');

  let continueProcessing = true;
  while (continueProcessing) {
    const packetsProcessed = wordsState.state.packetsProcessed;
    const packetCount = await packetService.getPacketCount();

    if (packetsProcessed < packetCount) {
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
        // split wordNodes into batches of 50
        for (let i = 0; i < wordNodes.length; i += 50) {
          const batch = wordNodes.slice(i, i + 50);
          // console.log('setWordsForProcessing', batch.length);
          // await wordsState.setWordsForProcessing(batch);
          console.log(' wordNodeService.createWordNodes', batch.length);
          await wordNodeService.createWordNodes(batch);
        }
        // console.log('setWordsForProcessing', wordNodes.length);
        // await wordsState.setWordsForProcessing(wordNodes);
        // console.log(' wordNodeService.createWordNodes', wordNodes.length);
        // await wordNodeService.createWordNodes(wordNodes);
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
  if (!packet || !packet.id) {
    console.error('Packet is null');
    return [];
  }
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
          wordsState.addWords(1);
          const word = boundaryBuffer;
          console.log('Found word:', word, 'in packet:', packet.id);
          const wordNode: WordNode = {
            word,
            packetNr: packet.id,
            position: { start: i, end: j },
            wordNr: wordsState.totalWords,
            chars: word.length,
          };
          words.push(wordNode);
        }
      } catch (error) {
        console.error('Error occurred while searching for word:', error);
      }
    }
  }

  return words;
}
