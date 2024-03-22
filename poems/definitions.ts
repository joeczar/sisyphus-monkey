import { redisClient } from '../db/redis/RedisClient';
import { definitionState } from '../state/DefinitionState';
import type { ApiWordDefinition } from '../types/ApiDefinition';
import { waitForKeysAndProcess } from './utils/redisUtils';

const pattern = 'word:*'; // Replace with your key pattern
const chunkSize = 100; // Define the size of each chunk
export const handleDefinitions = async () => {
  console.log('Fetching definitions');

  waitForKeysAndProcess(pattern, chunkSize, async (keysChunk) => {
    for (const key of keysChunk) {
      const word = key.split(':')[1];
      definitionState.totalWords++;
      const definition = await redisClient?.get(key);
      if (definition) {
        const parsedDefinition = JSON.parse(definition) as ApiWordDefinition;
        definitionState.setDefinition(word, parsedDefinition);
      }
    }
    console.log(
      `Processed ${definitionState.totalWords} words, ${definitionState.definitions} definitions cached`
    );
  });
};

// Example usage
