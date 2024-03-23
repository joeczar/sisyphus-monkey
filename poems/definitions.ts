import { get } from 'langchain/util/convex';
import { redisClient } from '../db/redis/RedisClient';
import { definitionState } from '../state/DefinitionState';
import type { ApiWordDefinition } from '../types/ApiDefinition';
import { waitForKeysAndProcess } from './utils/redisUtils';
import { getDefinition } from '../words/getDefinitions';
import { flattenWordDefinitions } from './utils/definitionUtils';

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
          if (definition === '404') {
            console.error(`${word}: Word does not exist`);
            return;
          }
          definitionState.setDefinition(word, definition);
          const flattenedDefinitions = flattenWordDefinitions(definition);
        }
      }, 3000);
    }
    console.log(
      `Processed ${definitionState.totalWords} words, ${definitionState.definitions} definitions cached`
    );
  });
};

// Example usage

// [
//   {
//     word: 'ee',
//     phonetics: [],
//     meanings: [
//       {
//         partOfSpeech: 'noun',
//         definitions: [{ definition: 'An eye.', synonyms: [], antonyms: [] }],
//         synonyms: [],
//         antonyms: [],
//       },
//     ],
//     license: {
//       name: 'CC BY-SA 3.0',
//       url: 'https://creativecommons.org/licenses/by-sa/3.0',
//     },
//     sourceUrls: ['https://en.wiktionary.org/wiki/ee'],
//   },
//   {
//     word: 'ee',
//     phonetics: [],
//     meanings: [
//       {
//         partOfSpeech: 'interjection',
//         definitions: [{ definition: 'Eh', synonyms: [], antonyms: [] }],
//         synonyms: [],
//         antonyms: [],
//       },
//     ],
//     license: {
//       name: 'CC BY-SA 3.0',
//       url: 'https://creativecommons.org/licenses/by-sa/3.0',
//     },
//     sourceUrls: ['https://en.wiktionary.org/wiki/ee'],
//   },
//   {
//     word: 'ee',
//     phonetics: [],
//     meanings: [
//       {
//         partOfSpeech: 'noun',
//         definitions: [
//           { definition: 'Enantiomeric excess.', synonyms: [], antonyms: [] },
//         ],
//         synonyms: [],
//         antonyms: [],
//       },
//     ],
//     license: {
//       name: 'CC BY-SA 3.0',
//       url: 'https://creativecommons.org/licenses/by-sa/3.0',
//     },
//     sourceUrls: ['https://en.wiktionary.org/wiki/ee'],
//   },
// ];
