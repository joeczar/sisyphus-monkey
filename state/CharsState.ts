import { type RedisConfig, redisConfig } from '../db/redisConfig';
import BaseState from './BaseState';

export type CharsStateType = {
  isReady: boolean;
  isFinishedWithChars: boolean;
  totalChars: number;
  totalPackets: number;
};

const defaultState: CharsStateType = {
  isReady: false,
  isFinishedWithChars: false,
  totalChars: 0,
  totalPackets: 0,
};
// TODO: htop system state
class CharsState extends BaseState<CharsStateType> {
  private constructor() {
    super();
    this.state = defaultState;
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
}

export const charsState = CharsState.getInstance('chars');
