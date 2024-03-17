import { createClient, type RedisClientType } from 'redis';

import { charEventsEmitter } from '../characters/charEvents';
import type { Packet } from '../characters/packet.type';
import type { WordData, WordDefinition } from '../types/wordData';

export class PacketChannelService {
  static rateLimit = 0;
  static redisClient: RedisClientType | null = null;
  static isConnected = false;

  static async initRedis(): Promise<void> {
    console.log('Initializing Redis client...');

    // if (!this.redisClient) {
    //   this.redisClient = createClient({
    //     url: process.env.REDIS_HOST,
    //   });
    //   console.log('Redis client created.');

    //   this.redisClient.on('connect', () => {
    //     this.isConnected = true;
    //     console.log('Redis connection established.');
    //   });

    //   this.redisClient.on('error', (error) => {
    //     this.isConnected = false;
    //     console.error('Error connecting to Redis:', error);
    //     throw error;
    //   });

    //   this.redisClient.on('close', () => {
    //     this.isConnected = false;
    //     console.log('Connection to Redis closed.');
    //   });

    //   // await this.redisClient.connect();
    //   console.log('Redis client initialized.');
    // }
  }

  static async addPacketToStream(packet: Packet) {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    await this.redisClient.xAdd('packetsStream', '*', {
      packet: JSON.stringify(packet),
    });
  }
  static async getWord(word: string) {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    try {
      const wordData = await this.redisClient.get(word);
      if (!wordData) {
        return null;
      }
      const parsed = JSON.parse(wordData) as WordData;
      if (parsed.trash) {
        return 'trash';
      }
      return parsed;
    } catch (error) {
      console.error('Error fetching word definition:', error);
      return null;
    }
  }

  static async setWord(word: string, wordData: WordData) {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    try {
      await this.redisClient?.set(word, JSON.stringify(wordData));
    } catch (error) {
      console.error('Error setting word definition:', error);
    }
  }

  static async setDefinition(
    word: string,
    definition: WordDefinition[] | '404'
  ) {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    try {
      const stringified = JSON.stringify(definition);
      const key = `def:${word}`;
      await this.redisClient?.set(key, stringified);
    } catch (error) {
      console.error('Error setting word definition:', error);
    }
  }
  static async getDefinition(word: string) {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    try {
      const key = `def:${word}`;
      const definition = await this.redisClient.get(key);
      if (!definition) {
        return null;
      }
      return definition;
    } catch (error) {
      console.error('Error fetching word definition:', error);
      return null;
    }
  }
  static async saveState(state: any) {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    try {
      await this.redisClient.set('state', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }
  static async getState() {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    try {
      const state = await this.redisClient.get('state');
      if (!state) {
        return null;
      }
      return JSON.parse(state);
    } catch (error) {
      console.error('Error fetching state:', error);
      return null;
    }
  }
  static async setMetadata(word: string, metadata: any) {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    try {
      await this.redisClient.set(`meta:${word}`, JSON.stringify(metadata));
    } catch (error) {
      console.error('Error setting metadata:', error);
    }
  }
  static async getMetadata(word: string) {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    try {
      const metadata = await this.redisClient.get(`meta:${word}`);
      if (!metadata) {
        return null;
      }
      return JSON.parse(metadata);
    } catch (error) {
      console.error('Error fetching metadata:', error);
      return null;
    }
  }

  // static async processStreamPackets() {
  //   if (!this.redisClient) {
  //     throw new Error('Redis client not initialized');
  //   }

  //   // Create a consumer group for the first time (ignore error if exists)
  //   try {
  //     await this.redisClient.xGroupCreate(
  //       'packetsStream',
  //       'packetProcessors',
  //       '0',
  //       {
  //         MKSTREAM: true,
  //       }
  //     );
  //   } catch (error) {
  //     if (
  //       !(error as Error).message.includes(
  //         'BUSYGROUP Consumer Group name already exists'
  //       )
  //     ) {
  //       throw error;
  //     }
  //   }

  //   // Continuously read and process packets from the stream
  //   while (true) {
  //     const data = await this.redisClient.xReadGroup(
  //       'packetProcessors', // Consumer Group name
  //       'processor1', // Consumer name
  //       [{ key: 'packetsStream', id: '>' }], // Read only new messages
  //       { BLOCK: 5000, COUNT: 10 } // Parameters
  //     );

  //     if (data) {
  //       for (const message of data[0].messages) {
  //         const packet = JSON.parse(message.message.packet);
  //         await this.processPacket(packet); // Your function to process the packet
  //         await this.redisClient.xAck(
  //           'packetsStream',
  //           'packetProcessors',
  //           message.id
  //         ); // Acknowledge processing
  //       }
  //     }
  //   }
  // }
}
