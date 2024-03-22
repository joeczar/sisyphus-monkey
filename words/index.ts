import { wordsState } from '../state/WordsState';
// import { WordsServer } from '../server/WordsServer';
import { redisClient, redisClientManager } from '../db/redis/RedisClient';
import { safeParseJson } from '../utils/safeJsonParse';
import { packetService } from '../db/neo4j/PacketService';
import type { Packet } from '../characters/packet.type';
import { processPackets } from './parsePackets';
import { switchMap, catchError } from 'rxjs';

// const server = new WordsServer();
// const app = server.getApp();

const handlePackets = () => {
  wordsState
    .packetsObservable()
    .pipe(
      switchMap(async (packetsProcessed) => {
        let packetCount = await packetService.getPacketCount();
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

const handleCharsMessage = async (parsedMessage: any) => {
  const { isReady, isFinishedWithChars, totalPackets } = parsedMessage;
  const { isFinishedWithWords } = wordsState.state;
  console.log('Parsed message:', parsedMessage);

  if (isFinishedWithChars) {
    console.log('Chars server is finished');
  }
  // if (isReady && !isFinishedWithWords) {
  console.log('Chars server is ready');
};

const initializeWords = async () => {
  console.log('Initializing words server...');
  await redisClientManager.connect();
  console.log('Connected to Redis & Clearing state');
  await wordsState.clearState();
  wordsState.logState();
  await wordsState.setIsReady(true);
  console.log('Words server is ready');
  wordsState.logState();
  wordsState.subscribeToChannel('channel:chars', async (message) => {
    console.log('Received message from chars:', message);
    const parsedMessage = await safeParseJson(message);
    if (true || parsedMessage) {
      await handleCharsMessage(parsedMessage).catch((error) =>
        console.error('Error handling chars message', error)
      );
    }
  });
  await handlePackets();
};

await initializeWords();

// export default {
//   port: 4002,
//   fetch: app.fetch.bind(app),
// };
