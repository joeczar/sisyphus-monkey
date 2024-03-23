import { AsyncQueue } from '../db/AsyncQueue';
import { redisClient, redisClientManager } from '../db/redis/RedisClient';
import type { WordNode } from '../types/wordNode';
import { delay } from '../utils/delay';
import { BaseState } from './BaseState';

export type WordStateType = {
  isReady: boolean;
  packetsProcessed: number;
  totalWords: number;
  isFinishedWithWords: boolean;
};

const defaultState: WordStateType = {
  isReady: false,
  packetsProcessed: 0,
  totalWords: 0,
  isFinishedWithWords: false,
};

export class WordsState extends BaseState<WordStateType> {
  static #instance: WordsState;
  static queue: AsyncQueue<WordNode> = new AsyncQueue<WordNode>();
  private constructor(private identifier: string, defaultState: WordStateType) {
    super(identifier, defaultState);
    this.state = defaultState;
  }

  public static getInstance(identifier: string, defaultState: WordStateType) {
    if (!this.#instance) {
      this.#instance = new WordsState(identifier, defaultState);
    }
    return this.#instance;
  }

  async setWordsForProcessing(words: WordNode[]) {
    if (!redisClient) {
      console.error('Redis client is not available.');
      return;
    }
    if (!words.length) {
      console.log('No words to process.');
      return;
    }

    const batchSize = 100;
    const rateLimitDelay = 200; // Delay in milliseconds between each batch

    try {
      console.log('Setting words for processing:', words.length);
      this.addWords(words.length); // Updates some internal state or Redis

      for (let i = 0; i < words.length; i += batchSize) {
        const batch = words.slice(i, i + batchSize);
        const multi = redisClient.multi();
        if (!multi) {
          console.error('Redis multi is not available.');
          return;
        }
        batch.forEach((word) => {
          const key = `word:${word.wordNr}`;
          multi.set(key, JSON.stringify(word));
        });

        const results = await multi.exec();
        console.log(`Batch ${i / batchSize + 1} processed:`, results);

        // Wait for a bit before processing the next batch
        await delay(rateLimitDelay);
      }
    } catch (error) {
      console.error('Error setting words for processing:', error);
    }
  }

  async setIsReady(isReady: boolean) {
    this.state = { ...this.state, isReady };
  }

  async setIsFinishedWithWords(isFinishedWithWords: boolean) {
    this.state = { ...this.state, isFinishedWithWords };
  }

  async addWords(totalWords: number) {
    this.state = {
      ...this.state,
      totalWords: this.state.totalWords + totalWords,
    };
  }
  get totalWords() {
    return this.state.totalWords;
  }
  async addToPacketsProcessed(packetsProcessed: number) {
    this.state = {
      ...this.state,
      packetsProcessed: this.state.packetsProcessed + packetsProcessed,
    };
  }

  packetsObservable() {
    return this.select('packetsProcessed');
  }

  async clearState() {
    this.state = defaultState;
  }
}

export const wordsState = WordsState.getInstance('words', defaultState);
