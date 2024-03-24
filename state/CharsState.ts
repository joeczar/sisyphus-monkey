// Make sure to import your newly set up Redis client

import { redisClient } from '../db/redis/RedisClient';
import { BaseState } from './BaseState';

export type CharsStateType = {
  isReady: boolean;
  isFinishedWithChars: boolean;
  totalChars: number;
  totalPackets: number;
  sortedFilenames: string[];
  processedFilenames: string[];
};

const defaultState: CharsStateType = {
  isReady: false,
  isFinishedWithChars: false,
  totalChars: 0,
  totalPackets: 0,
  sortedFilenames: [],
  processedFilenames: [],
};

class CharsState extends BaseState<CharsStateType> {
  static #instance: CharsState;

  private constructor() {
    super('chars', defaultState);
  }

  public static getInstance(): CharsState {
    if (!this.#instance) {
      this.#instance = new CharsState();
    }
    return this.#instance;
  }

  async setIsReady(isReady: boolean) {
    this.state = { ...this.state, isReady };
  }

  async setIsFinishedWithChars(isFinishedWithChars: boolean) {
    this.state = { ...this.state, isFinishedWithChars };
  }

  async addToTotalChars(totalChars: number) {
    this.state = {
      ...this.state,
      totalChars: this.state.totalChars + totalChars,
    };
  }

  async addToTotalPackets(totalPackets: number) {
    this.state = {
      ...this.state,
      totalPackets: this.state.totalPackets + totalPackets,
    };
  }
  totalPacketsObservable() {
    return this.select('totalPackets');
  }
  async clearState() {
    this.state = defaultState;
  }
  async setSortedFilenames(sortedFilenames: string[]) {
    this.state = { ...this.state, sortedFilenames };
  }
  get sortedFilenames() {
    return this.state.sortedFilenames;
  }
  set sortedFilenames(sortedFilenames: string[]) {
    this.state = { ...this.state, sortedFilenames };
  }
  getNextFilename() {
    const fileName = this.state.sortedFilenames.shift();
    this.state = { ...this.state, sortedFilenames: this.state.sortedFilenames };
    return fileName;
  }
  async addProcessedFilename(filename: string) {
    this.state = {
      ...this.state,
      processedFilenames: [...this.state.processedFilenames, filename],
    };
  }
  get totalFiles() {
    return (
      this.state.sortedFilenames.length + this.state.processedFilenames.length
    );
  }
}

// Initialize the CharsState with the Redis client
export const charsState = CharsState.getInstance();
