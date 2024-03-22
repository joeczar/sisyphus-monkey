import type { Packet } from '../characters/packet.type';
import { packetService } from '../db/neo4j/PacketService';
import { wordsState } from '../state/WordsState';
import { wordTrie } from '../found-words/trieService';
import { PacketChannelService } from './RedisWordService';
import type { WordNode } from '../types/wordNode';

const MAX_WORD_LENGTH = 20;

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
          const wordNode = await createWordNode(boundaryBuffer, packet.id, {
            start: i,
            end: j,
          });
          words.push(wordNode);
        }
      } catch (error) {
        console.error('Error occurred while searching for word:', error);
      }
    }
  }

  return words;
}

export async function createWordNode(
  word: string,
  packetId: number,
  position: { start: number; end: number }
) {
  const wordNode: WordNode = {
    word,
    packetNr: packetId,
    position,
    wordNr: wordsState.totalWords,
    chars: word.length,
  };
  await wordsState.addToTotalWords(1);
  return wordNode;
}
