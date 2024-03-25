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

export const handlePackets = async (ids: string[]) => {
  console.log('Starting packet processing...');

  const packetsProcessed = wordsState.state.packetsProcessed;

  const toProcess: number[] = ids
    .filter((id) => !packetsProcessed.includes(parseInt(id)))
    .map((id) => parseInt(id));
  console.log('To process:', toProcess);
  wordsState.addProcessQueue(toProcess);
};

export const processPackets = async (id: number) => {
  console.log('Processing packets:', id);
  try {
    const packet = await packetService.getPacket(id);
    if (!packet) {
      console.error('Packet not found:', id);
      return;
    }
    console.log('Fetched Packet:', packet.id);

    const wordNodes = await parsePacket(packet);

    for (let i = 0; i < wordNodes.length; i += 50) {
      const batch = wordNodes.slice(i, i + 50);

      console.log('wordNodeService.createWordNodes', batch.length);
      await wordNodeService.createWordNodes(batch);
    }

    wordsState.addToPacketsProcessed(packet.id);
  } catch (error) {
    console.error('Error occurred while getting packets:', error);
  }
};

export async function parsePacket(
  packet: Packet | number
): Promise<WordNode[]> {
  if (typeof packet === 'number') {
    packet = (await packetService.getPacket(packet)) as Packet;
  }
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
            wordNr: await wordsState.incrementWords(),
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
