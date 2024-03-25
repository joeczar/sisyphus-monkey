import { AsyncQueue } from '../db/AsyncQueue';
import { redisClient, redisClientManager } from '../db/redis/RedisClient';
import type { WordNode } from '../types/wordNode';
import { delay } from '../utils/delay';
import { BaseState } from './BaseState';

export type WordStateType = {
  isReady: boolean;
  packetsProcessed: number[];
  totalWords: number;
  isFinishedWithWords: boolean;
  processQueue: number[];
};

const defaultState: WordStateType = {
  isReady: false,
  packetsProcessed: [],
  totalWords: 0,
  isFinishedWithWords: false,
  processQueue: [],
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
  async incrementWords() {
    this.state = {
      ...this.state,
      totalWords: this.state.totalWords + 1,
    };
    return this.state.totalWords;
  }
  addToPacketsProcessed(id: number) {
    this.state = {
      ...this.state,
      packetsProcessed: [...this.state.packetsProcessed, id],
    };
  }
  get packetsProcessed() {
    return this.state.packetsProcessed;
  }
  get processQueue() {
    return this.state.processQueue;
  }

  async addProcessQueue(id: number | number[]) {
    const newIds = Array.isArray(id) ? id : [id];
    this.state = {
      ...this.state,
      processQueue: [...this.state.processQueue, ...newIds],
    };
  }

  async removeFromProcessQueue(id: number) {
    this.state = {
      ...this.state,
      processQueue: this.state.processQueue.filter((i) => i !== id),
    };
  }
  moveFromProcessQueueToProcessed(id: number) {
    this.state = {
      ...this.state,
      processQueue: this.state.processQueue.filter((i) => i !== id),
      packetsProcessed: [...this.state.packetsProcessed, id],
    };
  }

  async clearState() {
    this.state = defaultState;
  }
}

export const wordsState = WordsState.getInstance('words', defaultState);
