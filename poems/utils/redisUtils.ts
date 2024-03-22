import { redisClient } from '../../db/redis/RedisClient';

type ScanOptions = {
  MATCH: string;
  COUNT: number;
};

export async function countWordKeys() {
  let cursor = 0;
  let count = 0;

  do {
    const reply = await redisClient?.scan(cursor, {
      MATCH: 'word:*',
      COUNT: count,
    });
    cursor = reply?.cursor ? reply.cursor : 0;
    count += reply?.keys.length ? reply.keys.length : 0;
  } while (cursor !== 0);

  await redisClient?.quit();

  return count;
}

export async function* iterateKeysAndFetchValues(
  pattern: string,
  chunkSize: number
): AsyncGenerator<string[]> {
  let cursor = 0;
  do {
    // Using SCAN with COUNT to retrieve keys in chunks
    const reply: { cursor: number; keys: string[] } | undefined =
      await redisClient?.scan(cursor, { MATCH: pattern, COUNT: chunkSize });
    if (reply) {
      cursor = parseInt(reply.cursor.toString(), 10);
      const keys = reply.keys;
      if (keys.length > 0) {
        // Fetching values for the keys
        const flattenedKeys = keys.flat(); // Flatten the keys array
        const values = await redisClient?.mGet(flattenedKeys);
        yield values?.filter((v) => v !== null) ?? []; // Filter out nulls in case of missing keys
      }
    }
  } while (cursor !== 0);
}

export async function waitForKeysAndProcess(
  pattern: string,
  chunkSize: number,
  processChunk: (keysChunk: string[]) => Promise<void>
) {
  let keysExist = await checkForKeys(pattern);

  while (!keysExist) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    keysExist = await checkForKeys(pattern);
  }

  for await (const keysChunk of iterateKeysAndFetchValues(pattern, chunkSize)) {
    console.log('Keys chunk:', keysChunk);
    await processChunk(keysChunk);
  }
}

async function checkForKeys(pattern: string): Promise<boolean> {
  const response: { cursor: number; keys: string[] } | undefined =
    await redisClient?.scan(0, { MATCH: pattern, COUNT: 0 });
  return (response?.keys?.length ?? 0) > 0;
}

export async function deleteKeysByPattern(pattern: string) {
  let cursor = 0;
  do {
    const reply = await redisClient?.scan(cursor, {
      MATCH: pattern,
      COUNT: 100,
    });
    cursor = reply?.cursor ?? 0;
    const keys = reply?.keys ?? [];
    if (keys.length > 0) {
      await redisClient?.del(keys);
    }
  } while (cursor !== 0);

  await redisClient?.quit();
}
