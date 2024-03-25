import { getAndSortFiles } from '../characters/readAndSavePackets';
import { charsState } from '../state/CharsState';
import { packetRoutes } from './charsRoutes/packetRoutes';
import { ServerBase } from './ServerBase';
import { Hono } from 'hono';

export class CharServer extends ServerBase {
  constructor() {
    super();
  }

  initialize() {
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupRoutes() {
    this.app.get('/', (c) => c.json({ chars: 'server is running' }));
    this.app.notFound((c) => c.json({ message: 'No Bueno', ok: false }, 404));
    this.app.route('/packets', packetRoutes);
  }
}
