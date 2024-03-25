import { handle } from 'hono/cloudflare-pages';
import { ServerBase } from './ServerBase';
import { parsePacket } from '../words/parsePackets';

export class WordsServer extends ServerBase {
  constructor() {
    super();
  }

  setupRoutes() {
    this.app.get('/', (c) => c.json({ words: 'server is running' }));
    this.app.notFound((c) => c.json({ message: 'No Bueno', ok: false }, 404));
    this.app.post('/parse-packet', async (c) => {
      try {
        const body = await c.req.json();
        const packetId = body?.packetId;
        if (!packetId) {
          return c.json(
            { message: 'No packet provided', body, ok: false },
            400
          );
        }
        const id = parseInt(String(packetId), 10);
        const packet = await parsePacket(id);
        // Add the packet to the queue
        return c.json({
          message: 'Packet parsed and added to queue',
          ok: true,
        });
      } catch (err) {
        console.error('Error parsing packet:', err);
        return c.json({ message: 'Error parsing packet', ok: false }, 500);
      }
    });
  }
}
