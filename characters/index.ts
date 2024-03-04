import { Redis } from 'ioredis';
import { processFolder } from '../characters/readAndParse';
// import { pullPacketsForParsing } from "./pullPacketsForParsing";
import { DatabaseService } from '../db/database';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import { Hono } from 'hono';
import { chars } from './charsRoutes';
import type { Packet } from './packet.type';
import { RedisService } from '../db/Redis';

const app = new Hono();

app.get('/', (c) => c.json({ abara: 'Cadabara' }));
app.route('/chars', chars);
app.use(prettyJSON());
app.use(cors());
app.notFound((c) => c.json({ message: 'No Bueno', ok: false }, 404));
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Perform necessary cleanup or restart policy
});
// Function to start the server and process character data
async function startServerAndProcessData() {
  try {
    console.log('Starting server...');
    await DatabaseService.initDb();

    await processFolder();
    // Uncomment the next line if you want to start pulling packets for parsing after processing the folder
    // await pullPacketsForParsing();
  } catch (err) {
    console.error('Error during server startup and data processing:', err);
  }
}

// Start the server and process the data
startServerAndProcessData();

// Bun-specific export for handling fetch events
export default {
  port: 4000,
  fetch: app.fetch,
};
