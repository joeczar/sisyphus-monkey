import { Hono } from 'hono';

import { DatabaseService } from '../db/database';

export const chars = new Hono();
console.log("chars started")
chars.get('/', (c) => {
  return c.text('Hello Hono!');
});

chars.get('/:packetNr', async (c) => {
  const packetNr = c.req.param('packetNr') as string;
  const packet = await DatabaseService.getPacket(parseInt(packetNr, 10));
  return c.json({ packet });
});
