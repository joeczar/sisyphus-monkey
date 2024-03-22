import { createClient, type RedisClientType } from 'redis';

import { charEventsEmitter } from '../characters/charEvents';
import type { Packet } from '../characters/packet.type';
import type { WordNode } from '../types/wordNode';
import { redisClient } from '../db/redis/RedisClient';
import type { WordDefinition } from '../types/wordData';

export class PacketChannelService {
  static rateLimit = 0;
  static redisClient: RedisClientType | null = null;
  static isConnected = false;

  static async addPacketToStream(packet: Packet) {
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }
    await redisClient.xAdd('packetsStream', '*', {
      packet: JSON.stringify(packet),
    });
  }
  static async getWord(word: string) {
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }
    try {
      const wordNode = await redisClient.get(word);
      if (!wordNode) {
        return null;
      }
      const parsed = JSON.parse(wordNode) as WordNode;
      if (parsed.trash) {
        return 'trash';
      }
      return parsed;
    } catch (error) {
      console.error('Error fetching word definition:', error);
      return null;
    }
  }

  static async setWord(word: string, wordNode: WordNode) {
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }
    try {
      await redisClient?.set(word, JSON.stringify(wordNode));
    } catch (error) {
      console.error('Error setting word definition:', error);
    }
  }

  static async setDefinition(
    word: string,
    definition: WordDefinition[] | '404'
  ) {
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }
    try {
      const stringified = JSON.stringify(definition);
      const key = `def:${word}`;
      await redisClient?.set(key, stringified);
    } catch (error) {
      console.error('Error setting word definition:', error);
    }
  }
  static async getDefinition(word: string) {
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }
    try {
      const key = `def:${word}`;
      const definition = await redisClient.get(key);
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
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }
    try {
      await redisClient.set('state', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }
  static async getState() {
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }
    try {
      const state = await redisClient.get('state');
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
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }
    try {
      await redisClient.set(`meta:${word}`, JSON.stringify(metadata));
    } catch (error) {
      console.error('Error setting metadata:', error);
    }
  }
  static async getMetadata(word: string) {
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }
    try {
      const metadata = await redisClient.get(`meta:${word}`);
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
  //   if (!redisClient) {
  //     throw new Error('Redis client not initialized');
  //   }

  //   // Create a consumer group for the first time (ignore error if exists)
  //   try {
  //     await redisClient.xGroupCreate(
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
  //     const data = await redisClient.xReadGroup(
  //       'packetProcessors', // Consumer Group name
  //       'processor1', // Consumer name
  //       [{ key: 'packetsStream', id: '>' }], // Read only new messages
  //       { BLOCK: 5000, COUNT: 10 } // Parameters
  //     );

  //     if (data) {
  //       for (const message of data[0].messages) {
  //         const packet = JSON.parse(message.message.packet);
  //         await this.processPacket(packet); // Your function to process the packet
  //         await redisClient.xAck(
  //           'packetsStream',
  //           'packetProcessors',
  //           message.id
  //         ); // Acknowledge processing
  //       }
  //     }
  //   }
  // }
}
