import { type RedisClientType } from 'redis';

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
  protected isConnected = false;
  protected static instance: BaseState<any>;
  protected redisClient: RedisClientType | undefined;
  #state: T;

  constructor(identifier: string, redisClient: RedisClientType) {
    this.prefix = `state:${identifier}`;
    this.channel = Channel[identifier as keyof typeof Channel] || Channel.db;
    this.redisClient = redisClient;
    this.#state = {} as T;
  }

  public static getInstance<T>(
    identifier: string,
    redisClient: RedisClientType
  ): BaseState<T> {
    if (!BaseState.instance) {
      BaseState.instance = new BaseState<T>(identifier, redisClient);
    }
    return BaseState.instance;
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
    await this.redisClient?.set(this.prefix, JSON.stringify(this.#state));
  }

  async publishState(state: T): Promise<void> {
    await this.redisClient?.publish(this.channel, JSON.stringify(state));
  }

  subscribeToChannel(
    channel: string,
    callback: (message: string) => void
  ): void {
    this.redisClient
      ?.subscribe(channel, (message) => {
        callback(message);
      })
      .catch(console.error);
  }
}

export default BaseState;
