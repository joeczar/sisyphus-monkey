import { wordsState } from '../state/WordsState';
// import { WordsServer } from '../server/WordsServer';
import { redisClient } from '../db/redis/redisConnect';
import { safeParseJson } from '../utils/safeJsonParse';
import { packetService } from '../db/neo4j/PacketService';
import type { Packet } from '../characters/packet.type';
import { processPackets } from './parsePackets';

// const server = new WordsServer();
// const app = server.getApp();

const handleCharsMessage = async (parsedMessage: any) => {
  const { isReady, isFinishedWithChars, totalPackets } = parsedMessage;
  const { isFinishedWithWords, packetsProcessed } = wordsState.state;
  console.log('Parsed message:', parsedMessage);
  const packetCount: number = await packetService.getPacketCount();
  console.log('Packet count:', packetCount);
  if (isFinishedWithChars) {
    console.log('Chars server is finished');
  }
  // if (isReady && !isFinishedWithWords) {
  console.log('Chars server is ready');

  // while (packetsProcessed <= packetCount) {
  try {
    // const packets = (await packetService
    //   .getPackets(50, packetsProcessed)
    //   .catch((error) =>
    //     console.error('Error fetching packets', error)
    //   )) as Packet[];

    // console.log('Packets:', packets?.length);

    // if (packets?.length === 0) {
    //   console.log('No packets to process');
    // }
    // wordsState.addToPacketsProcessed(packets.length);
    const wordNodes = processPackets(50, packetsProcessed);
    console.log('Word nodes:', wordNodes);
  } catch (error) {
    console.error('Error fetching packets:', error);
  }

  // }
  // }
};

const initializeWords = async () => {
  console.log('Initializing words server...');
  await wordsState.setIsReady(true);
  console.log('Words server is ready');

  wordsState.subscribeToChannel('channel:chars', async (message) => {
    console.log('Received message from chars:', message);
    const parsedMessage = await safeParseJson(message);
    if (true || parsedMessage) {
      await handleCharsMessage(parsedMessage).catch((error) =>
        console.error('Error handling chars message', error)
      );
    }
  });
};

await initializeWords();

// export default {
//   port: 4002,
//   fetch: app.fetch.bind(app),
// };
