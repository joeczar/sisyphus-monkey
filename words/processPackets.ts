import type { Packet } from '../characters/packet.type';
import type { Trie } from '../found-words/Trie';
import type { WordData } from '../types/wordData';

const MAX_WORD_LENGTH = 20;

export async function processPackets(packet: Packet, trie: Trie) {
  let boundaryBuffer = '';
  const words = [];

  // check each character in the packet for a word
  for (let i = 0; i < packet.chunk.length; i++) {
    boundaryBuffer += packet.chunk[i];

    // check for a word in the buffer
    for (
      let j = 0;
      j < Math.min(MAX_WORD_LENGTH, packet.chunk.length - i);
      j++
    ) {
      let potentialWord =
        boundaryBuffer + packet.chunk.substring(i + 1, i + j + 1);
      if (trie.search(potentialWord)) {
        console.log(`${potentialWord}, `);
        words.push({
          word: potentialWord,
          packetNr: packet.packetNr,
          position: { i, j },
          buffer: boundaryBuffer,
        } as WordData);
      }
    }
  }
  return words;
}
