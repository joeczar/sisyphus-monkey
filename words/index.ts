// import { pullPacketsForParsing } from './pullPacketsForParsing';
import { DatabaseService } from '../db/database';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import { Hono } from 'hono';
import { chars } from './charsRoutes';

async function startServer() {
  await DatabaseService.initDb();
  const app = new Hono();
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
})
