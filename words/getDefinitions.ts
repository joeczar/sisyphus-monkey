import type { WordData, WordDefinition } from '../types/wordData';
import { PacketChannelService } from './RedisWordService';

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

/**
 * Fetches data from the specified URL with retries.
 * @param url The URL to fetch data from.
 * @param options The fetch options.
 * @param maxRetries The maximum number of retries.
 * @returns A promise that resolves to the fetched data or rejects with an error.
 */
const fetchWithRetry = async (url: string, options = {}, maxRetries = 3) => {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = (await fetchWithTimeout(url, options)) as Response;
      if (response.ok) {
        return response;
      }
      lastError = new Error(
        `Failed to fetch data: ${response.status} ${response.statusText}`
      );
    } catch (error) {
      lastError = error;
    }
    console.log(`Retrying fetch attempt ${i + 1}`);
  }

  throw lastError;
};

/**
 * Retrieves the cached definition for the specified word.
 * @param word The word to retrieve the definition for.
 * @returns A promise that resolves to the cached definition or null if not found.
 */
const getCachedDefinition = async (word: string) => {
  const cachedDefinition = await PacketChannelService.getDefinition(word);
  if (cachedDefinition) {
    console.log('Definition found in cache');
    return JSON.parse(cachedDefinition);
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
      return cachedDefinition;
    }

    const response = (await fetchWithRetry(`${API_URL}/${word}`, {
      method: 'GET',
    })) as unknown as Response;
    const data = (await response.json()) as WordDefinition[];

    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};

export const getMeaning = async (word: string) => {
  const cachedDefinition = await getCachedDefinition(word);
  if (cachedDefinition) {
    return cachedDefinition[0].meanings[0];
  }

  try {
    const response = (await getDefinition(word)) as WordDefinition[];
    const meaning = response[0].meanings[0];
    return meaning;
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};

export async function addMeaning(wordData: WordData): Promise<WordData> {
  const meaning = await getMeaning(wordData.word);

  const wordObject: WordData = {
    ...wordData,
    meaning,
  };

  return wordObject;
}
