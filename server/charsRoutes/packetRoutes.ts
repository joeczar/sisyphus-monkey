import { Hono } from 'hono';
import {
  fetchAndSavePacket,
  getAndSortFiles,
} from '../../characters/readAndSavePackets';
import { charsState } from '../../state/CharsState';

export const packetRoutes = new Hono();
packetRoutes.get('/', async (c) => {
  try {
    const statePackets = charsState.totalFiles;
    if (statePackets === 0) {
      console.log('No packets found in state, loading files...');
      const sortedFiles = await getAndSortFiles();
      charsState.sortedFilenames = sortedFiles;
    }
    return c.json({
      packetFiles: charsState.totalFiles,
      fileNames: charsState.sortedFilenames,
    });
  } catch (err) {
    console.error('Error getting all packets:', err);
    return c.json({ message: 'Error getting all packets', ok: false }, 500);
  }
});

packetRoutes.get('/processed', async (c) => {
  try {
    return c.json({
      packetsProcessed: charsState.state.processedFilenames.length,
      fileNames: charsState.state.processedFilenames,
    });
  } catch (err) {
    console.error('Error getting all packets:', err);
    return c.json({ message: 'Error getting all packets', ok: false }, 500);
  }
});

packetRoutes.get('/process-next', async (c) => {
  try {
    const nextPacket = charsState.getNextFilename();
    if (!nextPacket) {
      return c.json({ message: 'No packets to process', ok: false });
    }
    const result = await fetchAndSavePacket(nextPacket);
    return c.json({ result });
  } catch (err) {
    console.error('Error getting next packet:', err);
    return c.json({ message: 'Error getting next packet', ok: false }, 500);
  }
});
