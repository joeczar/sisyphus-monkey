import { getAndParsePackets } from './readAndSavePackets';
import { packetService } from '../db/neo4j/PacketService';
import { CharServer } from '../server/CharServer';
import { charsState } from '../state/CharsState';
import { redisClient } from '../db/redis/redisConnect';

// const server = new CharServer();
// const app = server.getApp();

async function initializeChars() {
  const pong = await redisClient.ping();
  console.log('Redis ping:', pong);
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
  // charsState.setIsReady(true);
  // // get user input to start the process
  // const prompt = 'Press any key to start the process';
  // process.stdout.write(prompt);
  // for await (const line of console) {
  //   if (line) {
  //     // await getAndParsePackets();
  //     charsState.addToTotalPackets(1);
  //   }
  // }
}

await initializeChars();
// export default {
//   port: 4001, // Port is specified here for environments like Bun that use it
//   fetch: app.fetch.bind(app),
// };
