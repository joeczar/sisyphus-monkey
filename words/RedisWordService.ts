import { createClient, type RedisClientType } from 'redis';

import { charEventsEmitter } from '../characters/charEvents';
import type { Packet } from '../characters/packet.type';

export class PacketChannelService {
  static rateLimit = 0;
  static redisClient: RedisClientType | null = null;
  static isConnected = false;

  static async initRedis(): Promise<void> {
    console.log('Initializing Redis client...');

    if (!this.redisClient) {
      this.redisClient = createClient({
        url: process.env.REDIS_HOST,
      });
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

      await this.redisClient.connect();
      console.log('Redis client initialized.');
    }
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
      return await this.redisClient?.get(word);
    } catch (error) {
      console.error('Error fetching word definition:', error);
      return null;
    }
  }

  static async setWord(word: string, definition: string) {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    try {
      await this.redisClient?.set(word, definition);
    } catch (error) {
      console.error('Error setting word definition:', error);
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
