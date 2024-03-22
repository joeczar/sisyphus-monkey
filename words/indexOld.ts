import neo4j from 'neo4j-driver';
import { processFolder } from '../characters/old/readAndParse';
import { DatabaseService } from '../db/database';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import { Hono } from 'hono';
import { getCharPacketById } from '../api/apiSservice';
import { PacketChannelService } from './RedisWordService';
import { getAndParsePackets } from './getAndParsePackets';
import neo4jDb from '../db/Neo4jDb';

const PACKETS_URL = `${process.env.CHARS_URL}/chars`;

const app = new Hono();

app.get('/', (c) => c.json({ words: 'server is running' }));
app.use(prettyJSON());
app.use(cors());
app.notFound((c) => c.json({ message: 'No Bueno', ok: false }, 404));

// Function to start the server and process character data
async function startServerAndProcessData() {
  try {
    console.log('Starting server...');

    await PacketChannelService.initRedis();
    console.log('Redis connected:', PacketChannelService.isConnected);

    const neo4jConnected = await neo4jDb.checkConnection();
    console.log('Neo4j connected:', neo4jConnected);

    if (!neo4jConnected) {
      throw new Error('Neo4j connection failed');
    }

    // if (!PacketChannelService.isConnected) {
    //   // if the connection to redis fails, wait and try again 3 times then throw an error
    //   let retries = 0;
    //   while (!PacketChannelService.isConnected && retries < 3) {
    //     console.log('Retrying Redis connection...');
    //     await new Promise((resolve) => setTimeout(resolve, 1000));
    //     if (PacketChannelService.isConnected) {
    //       break;
    //     }
    //     retries++;
    //   }
    //   if (!PacketChannelService.isConnected) {
    //     throw new Error('Redis connection failed');
    //   }
    // }
    console.log('Processing character data...');
    await getAndParsePackets();
  } catch (err) {
    console.error('Error during server startup and data processing:', err);
    throw err;
  }
}

// Start the server and process the data
startServerAndProcessData();

// Bun-specific export for handling fetch events
export default {
  port: 4001,
  fetch: app.fetch,
};
