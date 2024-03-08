import type { WordDefinition } from '../types/wordData';

const DICT_API = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

export async function getDefinitions(word: string) {
  try {
    const response = await fetch(`${DICT_API}${word}`);
    const data = (await response.json()) as WordDefinition;
    return data;
  } catch (error) {
    console.error('Error fetching word definition:', error);
    return null;
  }
}
