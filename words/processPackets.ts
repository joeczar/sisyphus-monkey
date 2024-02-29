import type { Packet } from "../characters/packet.type";
import type { Trie } from "../found-words/Trie";
import type { WordData } from "../types/wordData";
import type { BoundaryWordData } from "../types/wordData";
import { wordTrie } from "../found-words/trieService";

const MAX_WORD_LENGTH = 20;
const trie = wordTrie;

export async function processPackets(packet: Packet) {
  const words = [];

  // check each character in the packet for a word
  for (let i = 0; i < packet.chunk.length; i++) {
    // Reset boundaryBuffer for each starting character
    let boundaryBuffer = "";

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
          } as WordData);
        }
      } catch (error) {
        console.error(`Error searching for word: ${error}`);
      }
    }
  }

  return words;
}

export function processBoundaryWords(
  currentPacket: Packet,
  nextPacket: Packet,
) {
  let boundaryBuffer = "";

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
export async function parsePacketBatch(packetBatch: Packet[]) {
  let words: WordData[] = [];
  let boundaryWords: BoundaryWordData[] = [];
  for (let i = 0; i < packetBatch.length; i++) {
    let currentPacket = packetBatch[i];
    let nextPacket = packetBatch[i + 1];

    try {
      if (nextPacket) {
        const result = processBoundaryWords(currentPacket, nextPacket);
        if (result) boundaryWords.push(result);
      }

      const packetWords = await processPackets(currentPacket);
      words.push(...packetWords);
    } catch (error) {
      console.error(`Error processing packet ${i}: ${error}`);
    }
  }
  const result = addBoundaryWordstoWords(words, boundaryWords);
  return result;
}

function addBoundaryWordstoWords(
  words: WordData[],
  boundaryWords: BoundaryWordData[],
) {
  for (let boundaryWord of boundaryWords) {
    words.push({
      word: boundaryWord.word,
      packetNr: boundaryWord.packetNr,
      position: boundaryWord.position,
    });
  }
  return words;
}
