import {
  redisClient,
  redisClientManager,
  redisSubClient,
} from '../db/redis/RedisClient';
import { redisPubClient } from '../db/redis/RedisClient';

export enum Channel {
  chars = 'channel:chars',
  words = 'channel:words',
  poems = 'channel:poems',
  llm = 'channel:llm',
  db = 'channel:db',
}

export class BaseState<T> {
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
    if (!redisClient || !redisClientManager.isConnected) {
      return;
    }
    await redisClient?.set(this.prefix, JSON.stringify(this.#state));
    console.log('State synced with Redis:', this.channel, this.#state);
  }

  protected async fetchStateFromRedis(): Promise<T | null> {
    if (!redisClient || !redisClientManager.isConnected) {
      return null;
    }
    const state = await redisClient?.get(this.prefix);
    if (!state) {
      return null;
    }
    return JSON.parse(state);
  }

  async publishState(state: T): Promise<void> {
    if (!redisPubClient || !redisClientManager.isConnected) {
      return;
    }
    await redisPubClient?.publish(this.channel, JSON.stringify(state));
  }

  subscribeToChannel(
    channel: string,
    callback: (message: string) => void
  ): void {
    redisSubClient
      ?.subscribe(channel, (message) => {
        callback(message);
      })
      .catch(console.error);
  }

  get prefixKey(): string {
    return this.prefix;
  }
  get channelName(): string {
    return this.channel;
  }

  logState() {
    console.log(this.#state);
  }

  async clearState() {
    await redisClient?.del(this.prefix);
    this.#state = {} as T;
  }
}
