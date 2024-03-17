import { chars } from './../characters/charsRoutes';
import RedisClient, { type Redis } from 'ioredis';
import { redisConfig, type RedisConfig } from '../db/redisConfig';

export enum Channel {
  chars = 'channel:chars',
  words = 'channel:words',
  poems = 'channel:poems',
  llm = 'channel:llm',
  db = 'channel:db',
}

class BaseState<T> {
  protected redisClient: Redis;

  protected prefix: string = '';
  protected channel: string = '';
  protected isConnected = false;
  protected static instances: Map<string, BaseState<any>> = new Map();
  #state: T = {} as T;

  constructor() {
    this.redisClient = new RedisClient(redisConfig);
    if (!BaseState.instances.has(this.prefix)) {
      console.log('Redis client created.');

      this.redisClient.on('connect', () => {
        this.isConnected = true;
        console.log('Redis connection established.');
      });

      this.redisClient.on('error', (error) => {
        this.isConnected = false;
        console.error('Error connecting to Redis:', error);
        throw error;
      });

      this.redisClient.on('close', () => {
        this.isConnected = false;
        console.log('Connection to Redis closed.');
      });

      this.redisClient.connect();
      console.log('Redis client initialized.');
    }
    console.log(`Redis ${this.prefix} client created.`);
  }

  public static getInstance(identifier: string): BaseState<unknown> {
    if (!BaseState.instances.has(identifier)) {
      BaseState.instances.set(identifier, new this());
    }
    return BaseState.instances.get(identifier) as BaseState<unknown>;
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
    this.redisClient.set(this.prefix, JSON.stringify(this.#state));
  }

  async publishState<T>(state: T): Promise<void> {
    await this.redisClient.publish(this.channel, JSON.stringify(state));
  }

  subscribeToChannel(
    channel: string,
    callback: (message: string) => void
  ): void {
    // Subscribe to the channel
    this.redisClient.subscribe(channel, (err, count) => {
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
    this.redisClient.on('message', (subscribedChannel, message) => {
      if (channel === subscribedChannel) {
        callback(message);
      }
    });
  }
}
const baseState = BaseState.getInstance('base');
export default BaseState;
