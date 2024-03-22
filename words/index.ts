import { wordsState } from '../state/WordsState';
// import { WordsServer } from '../server/WordsServer';
import { redisClientManager } from '../db/redis/RedisClient';
import { safeParseJson } from '../utils/safeJsonParse';
import { handlePackets, processPackets } from './parsePackets';

// const server = new WordsServer();
// const app = server.getApp();

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
  wordsState.packetsObservable().subscribe({
    next: (value) => console.log('packetsObservable emitted:', value),
    error: (err) => console.error('packetsObservable error:', err),
    complete: () => console.log('packetsObservable complete'),
  });
  console.log('Initializing words server...');
  await redisClientManager.connect();
  console.log('Connected to Redis & Clearing state');
  await wordsState.clearState();
  wordsState.logState();
  await wordsState.setIsReady(true);
  console.log('Words server is ready');

  handlePackets();
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
