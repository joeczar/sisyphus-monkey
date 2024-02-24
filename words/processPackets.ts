import type { Packet } from '../characters/packet.type';
import type { Trie } from '../found-words/Trie';
import type { WordData } from '../types/wordData';

const MAX_WORD_LENGTH = 20;

export async function processPackets(packet: Packet, trie: Trie) {
  const words = [];

  // check each character in the packet for a word
  for (let i = 0; i < packet.chunk.length; i++) {
    // Reset boundaryBuffer for each starting character
    let boundaryBuffer = '';

    for (
      let j = i;
      j < Math.min(i + MAX_WORD_LENGTH, packet.chunk.length);
      j++
    ) {
      boundaryBuffer += packet.chunk[j]; // Accumulate the next character in the sequence

      try {
        if (trie.search(boundaryBuffer)) {
          words.push({
            word: boundaryBuffer,
            packetNr: packet.packetNr,
            position: { start: i, end: j },
            buffer: boundaryBuffer,
          } as WordData);
        }
      } catch (error) {
        console.error(`Error searching for word: ${error}`);
      }
    }
  }
  const printedWords = words.map((word)=>word.word)
  process.stdout.write(printedWords.join(', ') + '\n');
  return words;
}
