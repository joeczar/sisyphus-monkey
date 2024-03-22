import type { Packet } from '../characters/packet.type';
import { packetService } from '../db/neo4j/PacketService';
import { wordsState } from '../state/WordsState';
import { wordTrie } from '../found-words/trieService';
import { PacketChannelService } from './RedisWordService';
import type { WordNode } from '../types/wordNode';
import { switchMap, catchError } from 'rxjs';

const MAX_WORD_LENGTH = 20;

export const handlePackets = () => {
  console.log('Handling packets...');
  wordsState
    .packetsObservable()
    .pipe(
      switchMap(async (packetsProcessed: number) => {
        console.log('SwitchMap packetsProcessed');
        let packetCount = await packetService.getPacketCount();
        console.log('SwitchMap packetsProcessed:', {
          packetsProcessed,
          packetCount,
        });
        while (packetsProcessed <= packetCount) {
          try {
            console.log('Processing packets. Packet count:', packetCount);
            await processPackets(50, packetsProcessed);
            packetCount = await packetService.getPacketCount(); // Update packetCount for the loop
          } catch (error) {
            console.error('Error fetching packets:', error);
            throw error; // Rethrow to be caught by catchError
          }
        }
      }),
      catchError((error: Error) => {
        console.error('Error in packets processing stream:', error);
        return []; // Return an observable or an empty array to complete the stream gracefully
      })
    )
    .subscribe({
      // next: () => {},
      error: (err) => console.error('Subscription error:', err),
    });
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
