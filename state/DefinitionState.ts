import { BaseState } from './BaseState'; // Adjust path as necessary
import { redisClientManager } from '../db/redis/RedisClient'; // Ensure correct path
import { fetchWithTimeout, fetchWithRetry } from '../utils/fetchUtils'; // These are extracted methods
import type { ApiWordDefinition } from '../types/ApiDefinition';
import type { Word } from '../characters/packet.type';
import type { WordNode } from '../types/wordNode';

type DefinitionStateType = {
  isReady: boolean;
  definitionApiIsReady: boolean;
  isFinishedWithDefinitions: boolean;
  definitions: number;
  totalWords: number;
};

const defaultState: DefinitionStateType = {
  isReady: false,
  definitionApiIsReady: false,
  isFinishedWithDefinitions: false,
  definitions: 0,
  totalWords: 0,
};

class DefinitionState extends BaseState<DefinitionStateType> {
  private API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';
  static #instance: DefinitionState;
  logging = false;

  private constructor() {
    super('definition', defaultState);
  }

  public static getInstance(): DefinitionState {
    if (!this.#instance) {
      this.#instance = new DefinitionState();
    }
    return this.#instance;
  }

  async setIsReady(isReady: boolean) {
    this.state = { ...this.state, isReady };
  }

  set definitionApiIsReady(definitionApiIsReady: boolean) {
    this.state = { ...this.state, definitionApiIsReady };
  }

  get definitionApiIsReady() {
    return this.state.definitionApiIsReady;
  }

  set isFinishedWithDefinitions(isFinishedWithDefinitions: boolean) {
    this.state = { ...this.state, isFinishedWithDefinitions };
  }

  set definitions(definitions: number) {
    this.state = {
      ...this.state,
      definitions: this.state.definitions + definitions,
    };
  }

  set totalWords(wordNumber: number) {
    this.state = {
      ...this.state,
      totalWords: (this.state.totalWords || 0) + wordNumber,
    };
  }

  get totalWords() {
    return this.state.totalWords;
  }

  checkApiReady() {
    const response = fetchWithTimeout(this.API_URL, { method: 'GET' });
    response
      .then(() => {
        this.definitionApiIsReady = true;
      })
      .catch((error) => {
        console.error('Definition API not ready:', error);
      });
  }

  private async getDefinitionFromCache(
    word: string
  ): Promise<ApiWordDefinition[] | '404' | null> {
    const cached = await redisClientManager.getKey(`definition:${word}`);
    return cached ? JSON.parse(cached) : null;
  }

  private async cacheDefinition(
    word: string,
    definition: ApiWordDefinition[]
  ): Promise<void> {
    await redisClientManager.setKey(
      `definition:${word}`,
      JSON.stringify(definition)
    );
  }

  private async fetchDefinition(
    word: string
  ): Promise<ApiWordDefinition[] | null> {
    try {
      const response = await fetchWithRetry(`${this.API_URL}/${word}`, {
        method: 'GET',
      });
      if (!response?.ok) {
        console.log(`${word}: Word does not exist`);
        redisClientManager.setKey(`definition:${word}`, '404');
        return null;
      }
      const data = (await response.json()) as ApiWordDefinition[];
      console.log(`Fetched definition for ${word}`);
      return data;
    } catch (error) {
      console.error('Error fetching definition:', error);
      return null;
    }
  }

  async getDefinition(
    word: string
  ): Promise<ApiWordDefinition[] | '404' | null> {
    let definition: ApiWordDefinition[] | '404' | null =
      await this.getDefinitionFromCache(word);
    if (definition === '404') {
      console.error(`${word}: Word does not exist`);
      return null;
    }
    if (!definition) {
      definition = await this.fetchDefinition(word);
      if (definition) {
        await this.cacheDefinition(word, definition);
        this.logging ?? console.log(`Definition for ${word} cached`);
      }
    }
    return definition;
  }

  async setDefinition(word: string, definition: ApiWordDefinition[] | null) {
    if (definition) {
      await this.cacheDefinition(word, definition);
      this.definitions += 1;
      console.log(`Definition for ${word} cached`);
    }
  }

  async clearState() {
    this.state = defaultState;
  }
}

export const definitionState = DefinitionState.getInstance();

// // Create a unique constraint for Word nodes to ensure no duplicates
// CREATE CONSTRAINT ON (w:Word) ASSERT w.name IS UNIQUE;

// // Assuming 'data' is your JSON input
// UNWIND data AS word_data
// MERGE (w:Word {name: word_data.word})
// ON CREATE SET w.url = word_data.sourceUrls[0], w.license = word_data.license.name

// // Process each meaning
// UNWIND word_data.meanings AS meaning
// MERGE (p:PartOfSpeech {name: meaning.partOfSpeech})
// MERGE (w)-[:HAS_MEANING]->(m:Meaning)
// MERGE (m)-[:PART_OF_SPEECH]->(p)

// // Process each definition
// UNWIND meaning.definitions AS definition
// MERGE (d:Definition {text: definition.definition})
// MERGE (m)-[:HAS_DEFINITION]->(d)
