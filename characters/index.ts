import { processFolder } from './readAndParse';
import { DatabaseService } from '../db/database';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import { Hono } from 'hono';
import { chars } from './server';

const app = new Hono();
app.route('/chars', chars)
app.use(prettyJSON());
app.notFound((c) => c.json({ message: 'Not Found', ok: false }, 404));
app.use(cors());

const main = async () => {
  console.log('Starting application');
  await DatabaseService.initDb();


  await processFolder();



};
main()
  .catch((error) => {
    console.error('Failed to start the application:', error);
  })
  .finally(async () => {
    DatabaseService.closeDb();
    console.log('Application exiting');
  });

export default {
  port: 4000,
  fetch: app.fetch,
}
