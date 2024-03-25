import { Hono } from 'hono';
import {
  fetchAndSavePacket,
  getAndSortFiles,
} from '../../characters/readAndSavePackets';
import { charsState } from '../../state/CharsState';

export const packetRoutes = new Hono();
packetRoutes.get('/', async (c) => {
  try {
    const statePackets = charsState.sortedFilenames.length;
    if (statePackets === 0) {
      console.log('No packets found in state, loading files...');
    }
    return c.json({
      unprocessed: charsState.sortedFilenames.length,
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
      packetsProcessed: charsState.state.processedIds.length,
      ids: charsState.state.processedIds,
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
    if (!result) {
      return c.json({ message: 'Error processing packet', ok: false });
    }
    charsState.addProcessedIds(result);
    return c.json({ result });
  } catch (err) {
    console.error('Error getting next packet:', err);
    return c.json({ message: 'Error getting next packet', ok: false }, 500);
  }
});

// Define your Packet type
type Packet = {
  id: string;
  content: string;
  // ... other properties
};

// Initialize Hono app
const app = new Hono();

// Define a route with a URL parameter
app.get('/packet/:id', async (c) => {
  // Extract the 'id' parameter from the URL
  const id = c.req.param('id');

  // You can now use this 'id' to fetch the packet data
  // For example, let's assume you have a function 'getPacketById' that returns a Packet or null
  const packet: Packet | null = await getPacketById(id);

  if (packet) {
    // If the packet is found, return it as JSON
    return c.json(packet);
  } else {
    // If the packet is not found, return a 404 error
    return c.notFound();
  }
});

// Function to simulate fetching a packet by ID
async function getPacketById(id: string): Promise<Packet | null> {
  // Implement your logic to fetch a packet by ID
  // This is just a placeholder for demonstration
  return {
    id: id,
    content: 'This is the packet content',
    // ... other properties
  };
}
