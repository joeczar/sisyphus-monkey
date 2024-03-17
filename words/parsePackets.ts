import type { Packet } from '../characters/packet.type';
import { packetService } from '../db/neo4j/PacketService';
import { wordsState } from '../state/WordsState';
import { wordTrie } from '../found-words/trieService';
import { PacketChannelService } from './RedisWordService';
import type { WordNode } from '../types/wordNode';

const MAX_WORD_LENGTH = 20;

export const processPackets = async (batchSize: number, offset: number) => {
  const packets = await packetService.getPackets(batchSize, offset);
  packets?.forEach(async (packet) => {
    const wordNodes = await parsePacket(packet);
    wordsState.setWordsForProcessing(wordNodes);
  });
};

export async function parsePacket(packet: Packet) {
  let words: WordNode[] = [];

  for (let i = 0; i < packet.content.length; i++) {
    let boundaryBuffer = '';

    for (
      let j = i;
      j < Math.min(i + MAX_WORD_LENGTH, packet.content.length);
      j++
    ) {
      boundaryBuffer += packet.content[j];

      if (wordTrie.search(boundaryBuffer.toLowerCase())) {
        console.log('Word found', boundaryBuffer);
        const wordNode = createWordNode(boundaryBuffer, packet.id, {
          start: i,
          end: j,
        });
        words.push(wordNode);
      }
    }
  }

  return words;
}

export function createWordNode(
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
  wordsState.addToTotalWords(1);
  return wordNode;
}
