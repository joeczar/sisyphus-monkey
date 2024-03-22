import { get } from 'langchain/util/convex';
import { redisClient } from '../db/redis/RedisClient';
import { definitionState } from '../state/DefinitionState';
import type { ApiWordDefinition } from '../types/ApiDefinition';
import { waitForKeysAndProcess } from './utils/redisUtils';
import { getDefinition } from '../words/getDefinitions';

const pattern = 'word:*'; // Replace with your key pattern
const chunkSize = 100; // Define the size of each chunk
export const handleDefinitions = async () => {
  console.log('Fetching definitions');

  waitForKeysAndProcess(pattern, chunkSize, async (keysChunk) => {
    for (const wordNodes of keysChunk) {
      setTimeout(async () => {
        const { word } = JSON.parse(wordNodes);
        definitionState.totalWords += 1;
        const definition = await definitionState.getDefinition(word);
        if (definition) {
          definitionState.setDefinition(word, definition);
        }
      }, 3000);
    }
    console.log(
      `Processed ${definitionState.totalWords} words, ${definitionState.definitions} definitions cached`
    );
  });
};

// Example usage
