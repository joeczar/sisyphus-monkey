import BaseState from './BaseState';

export type PoemStateType = {
  isReady: boolean;
  isFinishedWithPoems: boolean;
  totalDefinitions: number;
  totalUniqueWords: number;
  totalMetadata: number;
  totalPoems: number;
};

class PoemsState extends BaseState<PoemStateType> {
  static #instance: PoemsState;

  private constructor(identifier: string, defaultState: PoemStateType) {
    super(identifier, defaultState);
  }

  public static getInstance(
    identifier: string,
    defaultState: PoemStateType
  ): PoemsState {
    if (!this.#instance) {
      this.#instance = new PoemsState(identifier, defaultState);
    }
    return this.#instance;
  }

  async setIsReady(isReady: boolean) {
    this.state = { ...this.state, isReady };
  }

  async setIsFinishedWithPoems(isFinishedWithPoems: boolean) {
    this.state = { ...this.state, isFinishedWithPoems };
  }

  async addToTotalPoems(totalPoems: number) {
    this.state = {
      ...this.state,
      totalPoems: this.state.totalPoems + totalPoems,
    };
  }
}

export const poemsState = PoemsState.getInstance('poems', {
  isReady: false,
  totalDefinitions: 0,
  totalMetadata: 0,
  totalUniqueWords: 0,
  isFinishedWithPoems: false,
  totalPoems: 0,
});
