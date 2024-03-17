import { type Redis } from 'ioredis';
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
  protected channel: string = '';
  protected isConnected = false;
  protected static instance: BaseState<unknown>;
  protected redisClient: Redis | undefined;
  #state: T = {} as T;

  constructor(private identifier: string) {
    this.prefix = `state:${this.identifier}`;
    this.channel = `channel:${this.identifier}`;
  }

  public static getInstance(
    identifier: string,
    redisClient: Redis
  ): BaseState<unknown> {
    if (!this.instance) {
      this.instance = new BaseState(identifier);
      this.instance.redisClient = redisClient;
    }
    return this.instance;
  }

  get state(): T {
    return this.#state;
  }

  set state(newState: T) {
    this.#state = { ...this.state, ...newState };
    this.syncStateWithRedis().catch(console.error);
    console.log('State updated:', this.channel, this.#state);
    this.publishState(this.#state).catch(console.error);
  }

  private async syncStateWithRedis() {
    this.redisClient?.set(this.prefix, JSON.stringify(this.#state));
  }

  async publishState<T>(state: T): Promise<void> {
    await this.redisClient?.publish(this.channel, JSON.stringify(state));
  }

  subscribeToChannel(
    channel: string,
    callback: (message: string) => void
  ): void {
    // Subscribe to the channel
    this.redisClient?.subscribe(channel, (err, count) => {
      if (err) {
        // Handle error case
        console.error('Failed to subscribe: %s', err.message);
      } else {
        // Success case: Possibly log the subscription count or other success indication
        console.log(
          `Subscribed successfully! This client is currently subscribed to ${count} channels.`
        );
      }
    });

    // Listen for messages on the channel
    this.redisClient?.on('message', (subscribedChannel, message) => {
      if (channel === subscribedChannel) {
        callback(message);
      }
    });
  }
}
const baseState = BaseState.getInstance('base', redisClient);
export default BaseState;
