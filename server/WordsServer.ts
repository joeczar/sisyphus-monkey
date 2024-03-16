import { ServerBase } from './ServerBase';

export class WordsServer extends ServerBase {
  constructor() {
    super();
  }

  setupRoutes() {
    this.app.get('/', (c) => c.json({ words: 'server is running' }));
    this.app.notFound((c) => c.json({ message: 'No Bueno', ok: false }, 404));
  }
}
