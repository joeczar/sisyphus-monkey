import { redisClient } from '../db/redis/redisConnect';

export enum Channel {
  chars = 'channel:chars',
  words = 'channel:words',
  poems = 'channel:poems',
  llm = 'channel:llm',
  db = 'channel:db',
}

class BaseState<T> {
  protected prefix: string = '';
  protected channel: Channel = Channel.db;

  #state!: T;

  constructor(identifier: string, defaultState: T) {
    this.prefix = `state:${identifier}`;
    this.channel = Channel[identifier as keyof typeof Channel] || Channel.db;
    this.#state = defaultState;
    this.initializeState().catch(console.error);
  }

  async initializeState(): Promise<void> {
    const state = await this.fetchStateFromRedis();
    if (state) {
      // console.log('Fetched state from Redis:', this.channel, state);
      this.#state = state;
    } else {
      this.#state = { ...this.#state, ...this.#state };
    }
  }

  get state(): T {
    return this.#state;
  }

  set state(newState: T) {
    this.#state = { ...this.#state, ...newState };
    this.syncStateWithRedis().catch(console.error);
    // console.log('State updated:', this.channel, this.#state);
    this.publishState(this.#state).catch(console.error);
  }

  protected async syncStateWithRedis() {
    await redisClient?.set(this.prefix, JSON.stringify(this.#state));
    // console.log('State synced with Redis:', this.channel, this.#state);
  }

  protected async fetchStateFromRedis(): Promise<T | null> {
    const state = await redisClient?.get(this.prefix);
    if (!state) {
      return null;
    }
    return JSON.parse(state);
  }

  async publishState(state: T): Promise<void> {
    await redisClient?.publish(this.channel, JSON.stringify(state));
  }

  subscribeToChannel(
    channel: string,
    callback: (message: string) => void
  ): void {
    redisClient
      ?.subscribe(channel, (message) => {
        callback(message);
      })
      .catch(console.error);
  }
}

export default BaseState;
