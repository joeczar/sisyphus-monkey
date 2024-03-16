import { ServerBase } from './ServerBase';

export class CharServer extends ServerBase {
  constructor() {
    super();
  }

  setupRoutes() {
    this.app.get('/', (c) => c.json({ chars: 'server is running' }));
    this.app.notFound((c) => c.json({ message: 'No Bueno', ok: false }, 404));
  }
}
