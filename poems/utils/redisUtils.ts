import { redisClient } from '../../db/redis/RedisClient';

type ScanOptions = {
  MATCH: string;
  COUNT: number;
};

export async function countWordKeys() {
  let cursor = 0;
  let count = 0;

  do {
    // Adjusted the call to match expected parameter structure
    const reply = await redisClient?.scan(cursor, {
      MATCH: 'word:*',
      COUNT: count,
    });
    cursor = reply?.cursor ? reply.cursor : 0;
    count += reply?.keys.length ? reply.keys.length : 0;
    // Adjusted based on the structured reply
  } while (cursor !== 0);

  await redisClient?.quit();

  return count;
}

// Function to iterate through keys in chunks using SCAN
export async function* iterateKeysInChunks(
  pattern: string,
  chunkSize: number
): AsyncGenerator<string[]> {
  let cursor = 0;
  do {
    // Using SCAN with COUNT to retrieve keys in chunks
    const options: ScanOptions = {
      MATCH: pattern,
      COUNT: chunkSize,
    };
    const reply: { cursor: number; keys: string[] } = (await redisClient?.scan(
      cursor,
      options
    )) || { cursor: 0, keys: [] };
    cursor = reply.cursor;
    if (reply.keys.length > 0) {
      yield reply.keys;
    }
  } while (cursor !== 0);
}

// Function to wait for keys and then process them in chunks
export async function waitForKeysAndProcess(
  pattern: string,
  chunkSize: number,
  processChunk: (keysChunk: string[]) => Promise<void>
) {
  let keysExist = await checkForKeys(pattern);

  // Wait for keys to be added if they don't exist yet
  while (!keysExist) {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second
    keysExist = await checkForKeys(pattern);
  }

  // Once keys exist, start processing them in chunks
  for await (const keysChunk of iterateKeysInChunks(pattern, chunkSize)) {
    console.log('Keys chunk:', keysChunk);
    await processChunk(keysChunk);
  }
}

// Helper function to check if any keys exist
async function checkForKeys(pattern: string): Promise<boolean> {
  const response: { cursor: number; keys: string[] } | undefined =
    await redisClient?.scan(0, { MATCH: pattern, COUNT: 0 });
  return (response?.keys?.length ?? 0) > 0;
}
