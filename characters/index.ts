import { getAndParsePackets } from './readAndSavePackets';
import { packetService } from '../db/neo4j/PacketService';
// import { CharServer } from '../server/CharServer';
// import { charsState } from '../state/CharsState';
import { redisClient, redisClientManager } from '../db/redis/RedisClient';
import { charsState } from '../state/CharsState';

// const server = new CharServer();
// const app = server.getApp();

async function initializeChars() {
  console.log('Initializing chars server...');
  await redisClientManager?.connect();
  if (redisClientManager?.isConnected === false) {
    console.error('Could not connect to Redis');
    process.exit(1);
  }
  // await redisClient?.connect();
  const pong = await redisClient?.ping();
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
  packetService.clearDb();
  charsState.setIsReady(true);

  // get user input to start the process
  const prompt = 'Press any key to start the process';
  process.stdout.write(prompt);
  for await (const line of console) {
    if (line) {
      // await getAndParsePackets();
      // charsState.addToTotalChars(1);
    }
  }
}

await initializeChars();
// export default {
//   port: 4001, // Port is specified here for environments like Bun that use it
//   fetch: app.fetch.bind(app),
// };
