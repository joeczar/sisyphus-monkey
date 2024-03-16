import { Hono } from 'hono';
import { prettyJSON } from 'hono/pretty-json';
import { cors } from 'hono/cors';

export class ServerBase {
  app: Hono;
  constructor() {
    this.app = new Hono();
    this.setupMiddleware();
    this.setupRoutes();
    console.info('Server Running...');
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(prettyJSON());
  }

  setupRoutes() {
    this.app.get('/', (c) => c.json({ message: 'Server is running' }));
    this.app.notFound((c) => c.json({ message: 'Not Found', ok: false }, 404));
  }

  getApp() {
    return this.app;
  }
}

// // Example usage
// // const serverBase = new ServerBase();
// // const app = serverBase.getApp();

// // The export structure for compatibility with Bun, Deno, Cloudflare Workers, etc.
// export default {
//   port: 4001, // Port is specified here for environments like Bun that use it
//   fetch: app.fetch.bind(app),
// };
