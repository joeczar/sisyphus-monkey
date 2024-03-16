import { type RedisConfig, redisConfig } from '../db/redisConfig';
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
  constructor() {
    super('words');
    this.state = defaultState;
  }

  async setWordsForProcessing(words: WordNode[]) {
    this.addToTotalWords(words.length);
    const pipeline = this.redisClient.pipeline();
    words.forEach((word) => {
      this.redisClient.set(this.prefix, JSON.stringify(words));
    });
    await pipeline.exec();
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
  async addToPacketsProcessed(packetsProcessed: number) {
    this.state = {
      ...this.state,
      packetsProcessed: this.state.packetsProcessed + packetsProcessed,
    };
  }
}

export const wordsState = new WordsState();
