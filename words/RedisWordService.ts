import { createClient, type RedisClientType } from 'redis';

import { charEventsEmitter } from '../characters/charEvents';
import type { Packet } from '../characters/packet.type';

export class PacketChannelService {
  static rateLimit = 0;
  static redisClient: RedisClientType | null = null;

  static async initRedis(): Promise<void> {
    this.redisClient = createClient({
      url: process.env.REDIS_HOST,
    });

    try {
      console.log('Connecting to Redis...');
      await this.redisClient.connect();
      console.log('Redis connection established.');
    } catch (error) {
      console.error('Error connecting to Redis:', error);
      throw error;
    }
    console.log('Redis client initializing');
    this.redisClient?.on('connect', () => {
      console.log('Connected to Redis.');
    });

    this.redisClient?.on('error', (error: Error) => {
      console.error('Redis error:', error);
    });

    this.redisClient?.on('close', () => {
      console.log('Connection to Redis closed.');
    });
  }
  static async addPacketToStream(packet: Packet) {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    await this.redisClient.xAdd('packetsStream', '*', {
      packet: JSON.stringify(packet),
    });
  }
  static async processPacket(packet: Packet) {
    console.log('Processing packet:', packet);
    // Your packet processing logic here
  }
  static async processStreamPackets() {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }

    // Create a consumer group for the first time (ignore error if exists)
    try {
      await this.redisClient.xGroupCreate(
        'packetsStream',
        'packetProcessors',
        '0',
        {
          MKSTREAM: true,
        }
      );
    } catch (error) {
      if (
        !(error as Error).message.includes(
          'BUSYGROUP Consumer Group name already exists'
        )
      ) {
        throw error;
      }
    }

    // Continuously read and process packets from the stream
    while (true) {
      const data = await this.redisClient.xReadGroup(
        'packetProcessors', // Consumer Group name
        'processor1', // Consumer name
        [{ key: 'packetsStream', id: '>' }], // Read only new messages
        { BLOCK: 5000, COUNT: 10 } // Parameters
      );

      if (data) {
        for (const message of data[0].messages) {
          const packet = JSON.parse(message.message.packet);
          await this.processPacket(packet); // Your function to process the packet
          await this.redisClient.xAck(
            'packetsStream',
            'packetProcessors',
            message.id
          ); // Acknowledge processing
        }
      }
    }
  }
}
