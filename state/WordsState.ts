import { AsyncQueue } from '../db/AsyncQueue';
import { redisClient, redisClientManager } from '../db/redis/RedisClient';
import type { WordNode } from '../types/wordNode';
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

class WordsState extends BaseState<WordStateType> {
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
    try {
      console.log('Setting words for processing:', words.length);
      this.addToTotalWords(words.length);

      words.forEach((word) => {
        const key = `word:${word.wordNr}`;

        redisClient?.set(key, JSON.stringify(word));
      });
    } catch (error) {
      console.error('Error setting words for processing:', error);
      // Handle the error here
    }
  }

  async setIsReady(isReady: boolean) {
    this.state = { ...this.state, isReady };
  }

  async setIsFinishedWithWords(isFinishedWithWords: boolean) {
    this.state = { ...this.state, isFinishedWithWords };
  }

  async addToTotalWords(totalWords: number) {
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
  async clearState() {
    this.state = defaultState;
  }
}

export const wordsState = WordsState.getInstance('words', defaultState);
