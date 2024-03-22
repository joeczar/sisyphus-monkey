import { redisClient } from '../db/redis/RedisClient';
import { poemsState } from '../state/PoemsState';
import type { WordStateType } from '../state/WordsState';
import { safeParseJson } from '../utils/safeJsonParse';

// const server = new PoemsServer();
// const app = server.getApp();

// Utility function for safe JSON parsing

const handleWordsMessage = async (parsedMessage: WordStateType) => {
  const { isReady, isFinishedWithWords, totalWords } = parsedMessage;
  const { isFinishedWithPoems, totalDefinitions, totalMetadata, totalPoems } =
    poemsState.state;
  if (isFinishedWithWords) {
    console.log('Words server is finished');
  }
  if (isReady && !isFinishedWithWords) {
    console.log('poems server is ready');
  }
};

const initializePoems = async () => {
  console.log('Initializing poems server...');
  await poemsState.setIsReady(true);
  console.log('Poems server is ready');
  redisClient.subscribe('channel:words', async (message) => {
    console.log('Received message from words:', message);
    const parsedMessage = await safeParseJson(message);
    if (parsedMessage) {
      await handleWordsMessage(parsedMessage).catch((error) =>
        console.error('Error handling words message for poems:', error)
      );
    }
  });
};

await initializePoems();

export default {
  port: 4003,
  fetch: app.fetch.bind(app),
};
