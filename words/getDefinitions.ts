import { redisClient } from '../db/redis/RedisClient';
import type {
  ApiDefinition,
  ApiMeaning,
  ApiWordDefinition,
} from '../types/ApiDefinition';
import type {
  AntonymNode,
  MeaningNode,
  SynonymNode,
  WordNode,
} from '../types/wordNode';

const API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';

/**
 * Fetches data from the specified URL with a timeout.
 * @param url The URL to fetch data from.
 * @param options The fetch options.
 * @param timeout The timeout duration in milliseconds.
 * @returns A promise that resolves to the fetched data or rejects with an error.
 */
const fetchWithTimeout = (url: string, options = {}, timeout = 10000) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), timeout)
    ),
  ]);
};
const setDefinition = async (word: string, definition: string) => {
  await redisClient?.set(`definition:${word}`, definition);
};

const getRedisDefinition = async (word: string) => {
  const result = await redisClient?.get(`definition:${word}`);
  return JSON.parse(result!);
};

/**
 * Fetches data from the specified URL with retries.
 * @param url The URL to fetch data from.
 * @param options The fetch options.
 * @param maxRetries The maximum number of retries.
 * @returns A promise that resolves to the fetched data or rejects with an error.
 */
const fetchWithRetry = async (url: string, options = {}, maxRetries = 3) => {
  let lastError;
  const word = url.split('/').pop();

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = (await fetchWithTimeout(url, options)) as Response;
      if (response.ok) {
        return response;
      }
      if (word) await setDefinition(word, '404');
      lastError = new Error(
        `Failed to fetch ${word}: ${response.status} ${response.statusText}`
      );
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

/**
 * Retrieves the cached definition for the specified word.
 * @param word The word to retrieve the definition for.
 * @returns A promise that resolves to the cached definition or null if not found.
 */
const getCachedDefinition = async (
  word: string
): Promise<ApiDefinition | '404' | null> => {
  const cachedDefinition = await getDefinition(word);
  if (cachedDefinition) {
    return cachedDefinition as ApiDefinition;
  }
  return null;
};

/**
 * Stores the definition for the specified word in the cache.
 * @param word The word to store the definition for.
 */
export const getDefinition = async (word: string) => {
  try {
    const cachedDefinition = await getCachedDefinition(word);
    if (cachedDefinition) {
      if (cachedDefinition === '404') {
        console.log(word, 'Word does not exist');
        return null;
      }
      return cachedDefinition as ApiWordDefinition;
    }

    const response = await fetchWithRetry(`${API_URL}/${word}`, {
      method: 'GET',
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log(word, 'Word does not exist');
        await RedisService.setDefinition(word, '404');
        return null;
      }
      throw new Error(
        `Failed to fetch data: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as ApiWordDefinition;
    await setDefinition(word, data);
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    return null;
  }
};
const mapDefinitions = (definitions: ApiDefinition[]): MeaningNode => {
  const mappedDefinitions: MeaningNode = {
    partsOfSpeech: [],
    definitions: definitions.map((def) => def.definition),
    examples: definitions
      .filter((def) => def.example !== undefined)
      .map((def) => def.example!),
    synonyms: definitions.flatMap((def) =>
      def.synonyms.map((synonym) => ({ word: synonym }))
    ),
    antonyms: definitions.flatMap((def) =>
      def.antonyms.map((antonym) => ({ word: antonym }))
    ),
  };
  return mappedDefinitions;
};
const mapApiMeaningToNodes = (apiMeaning: ApiMeaning[]): MeaningNode[] => {
  return apiMeaning.map((apiMeaning) => {
    const { partOfSpeech, definitions, synonyms, antonyms } = apiMeaning;

    const meaningNode: MeaningNode = {
      partsOfSpeech: [],
      definitions: mapDefinitions(definitions),
    };
    return meaningNode;
  });
};

export const getMeaning = async (word: string) => {
  try {
    const definitions = await getDefinition(word);
    if (definitions && definitions.length > 0 && definitions[0].meanings) {
      return mapApiMeaningToNodes(definitions[0].meanings);
    } else {
      console.log('No meaning found for word:', word);
      return null;
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    return null;
  }
};

export async function addMeaning(
  wordNode: WordNode
): Promise<WordNode | undefined> {
  const meanings = await getMeaning(wordNode.word);
  if (meanings !== undefined && meanings !== null) {
    const wordObject: WordNode = {
      ...wordNode,
      meanings,
    };
    return wordObject;
  } else {
    console.log('No meaning found for word:', wordNode.word);
    return;
  }
}
