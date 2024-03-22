import { createClient } from 'redis';
import { redisConfig } from './redisConfig';
import { AsyncQueue } from '../AsyncQueue';

export interface RedisOperation {
  execute: () => Promise<any>;
}
export class RedisClient {
  static instance: RedisClient;
  client;
  pubClient;
  subClient;
  isConnected = false;
  operationQueue: AsyncQueue<RedisOperation>;

  constructor() {
    if (!RedisClient.instance) {
      this.client = this.createClient();
      this.pubClient = this.createClient();
      this.subClient = this.createClient();
      this.operationQueue = new AsyncQueue<RedisOperation>();

      this.startProcessingQueue();
      RedisClient.instance = this;
    }
    return RedisClient.instance;
  }

  createClient() {
    const client = createClient({
      url: `${redisConfig.host}`,
      password: redisConfig.password,
    });
    client.on('connect', () => {
      console.log('Redis client connected.');
    });
    client.on('error', (error) => {
      console.error('Error with Redis client:', error);
    });
    return client;
  }

  async connect() {
    if (!this.isConnected) {
      await Promise.all([
        this.client?.connect(),
        this.pubClient?.connect(),
        this.subClient?.connect(),
      ]);
      this.isConnected = true;
      console.log('All Redis clients successfully connected.');
    }
  }

  getClient() {
    return this.client;
  }

  getPublisher() {
    return this.pubClient;
  }

  getSubscriber() {
    return this.subClient;
  }

  async enqueueOperation(operation: RedisOperation) {
    await this.operationQueue.enqueue(operation);
  }

  async startProcessingQueue() {
    console.log('Starting Redis operation queue...');
    while (true) {
      const operation = await this.operationQueue.dequeue();
      try {
        const result = await operation.execute();
        console.log('Operation executed:', result);
      } catch (error) {
        console.error('Error processing operation:', error);
      }
    }
  }

  async setKey(key: string, value: string) {
    if (!this.isConnected || !key || !value) {
      return;
    }
    await this.enqueueOperation({
      execute: async () => {
        try {
          const result = await this.client?.set(key, value);
        } catch (error) {
          console.error('Error setting key:', error);
        }
      },
    });
  }

  async getKey(key: string) {
    if (!this.isConnected || !key) {
      return null;
    }
    try {
      return await this.enqueueOperation({
        execute: async () => await this.client?.get(key),
      });
    } catch (error) {
      console.error('Error getting key:', error);
      return null;
    }
  }

  async disconnect() {
    await Promise.all([
      this.client?.quit(),
      this.pubClient?.quit(),
      this.subClient?.quit(),
    ]);
    this.isConnected = false;
    console.log('All Redis clients successfully disconnected.');
  }
}

export const redisClientManager = new RedisClient();
export const redisClient = redisClientManager.getClient();
export const redisPubClient = redisClientManager.getPublisher();
export const redisSubClient = redisClientManager.getSubscriber();
