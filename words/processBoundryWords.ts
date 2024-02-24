import type { Packet } from '../characters/packet.type';
import type { Trie } from '../found-words/Trie';
import type { BoundaryWordData } from '../types/wordData';

const MAX_WORD_LENGTH = 20;

export function processBoundaryWords(
  currentPacket: Packet,
  nextPacket: Packet,
  trie: Trie
) {
  let boundaryBuffer = '';

  // Check the last N characters of the current packet, where N is the maximum word length you expect - 1
  for (
    let i = Math.max(0, currentPacket.chunk.length - MAX_WORD_LENGTH);
    i < currentPacket.chunk.length;
    i++
  ) {
    boundaryBuffer += currentPacket.chunk[i];

    // If boundaryBuffer + the start of the next packet contains a valid word, process it
    for (
      let j = 0;
      j < Math.min(MAX_WORD_LENGTH, nextPacket.chunk.length);
      j++
    ) {
      let potentialWord = boundaryBuffer + nextPacket.chunk.substring(0, j + 1);
      if (trie.search(potentialWord)) {
        return {
          word: potentialWord,
          packetNr: currentPacket.packetNr,
          position: { start: i, end: j },
          nextPacketNr: nextPacket.packetNr,
        } as BoundaryWordData;
      }
    }
  }
}
