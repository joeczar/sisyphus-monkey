import { ChatGroq } from '@langchain/groq';
import { BaseState } from './BaseState';
import { metadataPrompt } from '../langchain/metadataPrompt';
import { ChatPromptTemplate } from 'langchain/prompts';
import type { WordNode } from '../types/wordNode';
import { redisClient } from '../db/redis/RedisClient';

export type MetadataStateType = {
  isReady: boolean;
  metadataApiIsReady: boolean;
  isFinishedWithMetadata: boolean;
  metadataAdded: number;
  totalWords: number;
};
const defaultState: MetadataStateType = {
  isReady: false,
  metadataApiIsReady: false,
  isFinishedWithMetadata: false,
  metadataAdded: 0,
  totalWords: 0,
};

class MetadataState extends BaseState<MetadataStateType> {
  static #instance: MetadataState;
  logging = true;

  private constructor(identifier: string, defaultState: MetadataStateType) {
    super(identifier, defaultState);
  }

  public static getInstance(
    identifier: string,
    defaultState: MetadataStateType
  ): MetadataState {
    if (!this.#instance) {
      this.#instance = new MetadataState(identifier, defaultState);
    }
    return this.#instance;
  }

  async setIsReady(isReady: boolean) {
    this.state = { ...this.state, isReady };
  }

  set metadataApiIsReady(metadataApiIsReady: boolean) {
    this.state = { ...this.state, metadataApiIsReady };
  }

  get metadataApiIsReady() {
    return this.state.metadataApiIsReady;
  }

  set isFinishedWithMetadata(isFinishedWithMetadata: boolean) {
    this.state = { ...this.state, isFinishedWithMetadata };
  }

  set metadataAdded(number: number) {
    this.state = {
      ...this.state,
      metadataAdded: this.state.metadataAdded + number,
    };
  }

  set totalWords(wordNumber: number) {
    this.state = {
      ...this.state,
      totalWords: (this.state.totalWords || 0) + wordNumber,
    };
  }

  async clearState() {
    this.state = defaultState;
  }

  // cacheing
  async setMetadata(word: string, metadata: any) {
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }
    try {
      await redisClient.set(`meta:${word}`, JSON.stringify(metadata));
    } catch (error) {
      console.error('Error setting metadata:', error);
    }
  }

  async getMetadata(word: string) {
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }
    try {
      const metadata = await redisClient.get(`meta:${word}`);
      if (!metadata) {
        return null;
      }
      return JSON.parse(metadata);
    } catch (error) {
      console.error('Error fetching metadata:', error);
      return null;
    }
  }

  // llm metadata functions

  private async getPrompt(wordNode: WordNode) {
    const model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      modelName: 'mixtral-8x7b-32768',
      temperature: 1.1,
    });

    const input = metadataPrompt(wordNode);

    const prompt = ChatPromptTemplate.fromMessages(['human', '{input}']);

    const chain = prompt.pipe(model);
    const response = await chain.invoke({
      input,
    });

    return {
      response,
      wordNode,
      chain,
    };
  }

  private async generateMetadata(wordNode: WordNode) {
    try {
      const { response } = await this.getPrompt(wordNode);
      this.logging ?? console.log('generateMetadata Response:', response);
      if (!response) {
        throw new Error('No response from Groq');
      }
      if (
        typeof response.content === 'string' &&
        response.content.includes('"metadata":')
      ) {
        const { metadata } = JSON.parse(response.content);
        return metadata;
      }
    } catch (error) {
      console.error('Error generating metadata:', error);
    }
  }

  async addMetadata(wordNode: WordNode): Promise<WordNode> {
    const savedMetadata = await this.getMetadata(wordNode.word);
    if (savedMetadata) {
      this.logging ?? console.log('Metadata already saved:', savedMetadata);
      wordNode.metadata = savedMetadata;
      return wordNode;
    }
    const metadata = await this.generateMetadata(wordNode);
    if (metadata) {
      if (metadata && Array.isArray(metadata)) {
        await this.setMetadata(wordNode.word, metadata);
        wordNode.metadata = metadata;
      }
    }
    redisClient;
    return wordNode;
  }
}

export const metadataState = MetadataState.getInstance(
  'metadata',
  defaultState
);
