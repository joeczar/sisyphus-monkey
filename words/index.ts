// import { pullPacketsForParsing } from './pullPacketsForParsing';
import { DatabaseService } from '../db/database';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import { Hono } from 'hono';
import { chars } from './charsRoutes';

const app = new Hono();
async function startServer() {
  await DatabaseService.initDb();

  app.route('/chars', chars)
  app.use(prettyJSON());
  app.notFound((c) => c.json({ message: 'Not Found', ok: false }, 404));
  app.use(cors());
}
startServer().catch((err: Error) => {
  console.error('Error starting server:', err);
}).finally(() => {
  console.log('Server started');

  // pullPacketsForParsing();
  DatabaseService.closeDb();
})
export default {
  port: 4000,
  fetch: app.fetch,
}
