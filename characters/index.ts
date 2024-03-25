import { packetService } from '../db/neo4j/PacketService';
import { CharServer } from '../server/CharServer';
// import { charsState } from '../state/CharsState';
import { redisClient, redisClientManager } from '../db/redis/RedisClient';
import { charsState } from '../state/CharsState';
import { getAndSortFiles } from './readAndSavePackets';

const server = new CharServer();
const app = server.getApp();
server.initialize();

async function initializeChars() {
  console.log('Initializing chars server...');
  await redisClientManager?.connect();
  if (redisClientManager?.isConnected === false) {
    console.error('Could not connect to Redis');
    process.exit(1);
  }
  if ((await packetService.checkConnection()) === false) {
    console.error('Could not connect to Neo4j');
    // retry 3 times
    for (let i = 0; i < 3; i++) {
      console.log('Retrying connection...');
      if ((await packetService.checkConnection()) === true) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    // if still not connected, exit
    if ((await packetService.checkConnection()) === false) {
      console.error('Could not connect to Neo4j');
      process.exit(1);
    }
  }
  console.log('Connected to Redis & Neo4j - Clearing state');
  // packetService.clearDb();
  const sortedFiles = await getAndSortFiles();
  charsState.sortedFilenames = sortedFiles;
  charsState.setIsReady(true);
}

await initializeChars();
export default {
  port: 4001,
  fetch: app.fetch.bind(app),
};
