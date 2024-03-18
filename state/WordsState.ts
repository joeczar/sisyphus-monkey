import { redisClient } from '../db/redis/redisConnect';
import type { WordNode } from '../types/wordNode';
import BaseState from './BaseState';

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
    console.log('Setting words for processing:', words.length);
    this.addToTotalWords(words.length);
    const pipeline = redisClient.multi();

    words.forEach((word) => {
      const key = `word:${word.wordNr}`;
      console.log('Setting word:', key, word);
      pipeline?.set(key, JSON.stringify(word));
    });
    await pipeline?.exec();
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
}

export const wordsState = WordsState.getInstance('words', defaultState);
