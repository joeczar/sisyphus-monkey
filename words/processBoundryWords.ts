import type { Packet } from '../characters/packet.type';
import type { Trie } from '../found-words/Trie';

const MAX_WORD_LENGTH = 20;

export function processBoundaryWords(
  currentPacket: Packet,
  nextPacket: Packet,
  trie: Trie
) {
  // This example assumes you have a method trie.search(word) that returns true if the word exists,
  // and trie.startsWith(prefix) that returns true if there is a word that starts with the prefix.

  // Buffer to hold potential boundary-spanning word start
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
        console.log('Found boundary-spanning word:', potentialWord);
        // Handle the found word (e.g., store, send to client)
        // Make sure to adjust handling based on your application's needs
      }
    }
  }
}
