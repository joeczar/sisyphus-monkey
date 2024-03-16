import { wordsState } from '../state/WordsState';
import { WordsServer } from '../server/WordsServer';
import { parsePackets } from './parsePackets';

const server = new WordsServer();
const app = server.getApp();

const initializeWords = async () => {
  console.log('Initializing words server...');
  await wordsState.setIsReady(true);
  console.log('Words server is ready');
  await parsePackets();
};

await initializeWords();

export default {
  port: 4002,
  fetch: app.fetch.bind(app),
};
