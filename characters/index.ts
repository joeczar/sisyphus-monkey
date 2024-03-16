import { getAndParsePackets } from './readAndSavePackets';
import { packetService } from '../db/neo4j/PacketService';

async function initializeChars() {
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
  // get user input to start the process
  const prompt = 'Press any key to start the process';
  process.stdout.write(prompt);
  for await (const line of console) {
    if (line) {
      await getAndParsePackets();
    }
  }
}

await initializeChars();
