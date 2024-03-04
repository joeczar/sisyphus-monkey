import { processFolder } from '../characters/readAndParse';
import { pullPacketsForParsing } from './pullPacketsForParsing';
import { DatabaseService } from '../db/database';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import { Hono } from 'hono';
import { getCharPacketById } from '../api/apiSservice';
import { PacketChannelService } from './RedisWordService';

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
    await DatabaseService.initDb();
  } catch (err) {
    console.error('Error during server startup and data processing:', err);
  }
}

// Start the server and process the data
startServerAndProcessData();

// Bun-specific export for handling fetch events
export default {
  port: 4001,
  fetch: app.fetch,
};
