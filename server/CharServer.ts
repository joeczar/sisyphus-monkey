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
    // this.setupPacketsRoutes();
  }

  setupPacketsRoutes() {
    //   this.app.get('/packets', async (c) => {
    //     try {
    //       const statePackets = charsState.totalFiles;
    //       if (statePackets === 0) {
    //         console.log('No packets found in state, loading files...');
    //         const sortedFiles = await getAndSortFiles();
    //         charsState.sortedFilenames = sortedFiles;
    //       }
    //       return c.json({ packetFiles: charsState.totalFiles });
    //     } catch (err) {
    //       console.error('Error getting all packets:', err);
    //       return c.json({ message: 'Error getting all packets', ok: false }, 500);
    //     }
    //   });
  }
}
