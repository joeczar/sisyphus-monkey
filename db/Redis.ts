// import type { Packet } from '../characters/packet.type';
// import { createClient, type RedisClientType } from 'redis';

// import { charEventsEmitter } from '../characters/charEvents';

// export class RedisService {
//   static rateLimit = 0;
//   static redisClient: RedisClientType | null = null;
//   static isConnected = false;
//   static async initRedis(): Promise<void> {
//     console.log('Initializing Redis client...');
//     this.redisClient = createClient({
//       url: process.env.REDIS_HOST,
//     });

//     try {
//       console.log('Connecting to Redis...');
//       // await this.redisClient.connect();
//       console.log('Redis connection established.');
//     } catch (error) {
//       console.error('Error connecting to Redis:', error);
//       throw error;
//     }
//     console.log('Redis client initializing');
//     this.redisClient?.on('connect', () => {
//       console.log('Connected to Redis.');
//     });

//     this.redisClient?.on('error', (error: Error) => {
//       console.error('Redis error:', error);
//     });

//     this.redisClient?.on('close', () => {
//       console.log('Connection to Redis closed.');
//     });
//   }
//   static async addPacketToStream(packet: Packet) {
//     if (!RedisService.redisClient) {
//       throw new Error('Redis client not initialized');
//     }
//     await RedisService.redisClient.xAdd('packetsStream', '*', {
//       packet: JSON.stringify(packet),
//     });
//   }
//   // Insert a single packet
//   static async insertPacket(packet: Packet) {
//     try {
//       console.log('Inserting packet:', packet);
//       const { id, content, source, timestamp } = packet;
//       const packetData = JSON.stringify({ id, content, source, timestamp });
//       await this.redisClient?.set(`packet:${id}`, packetData);
//       console.log(`Inserted packet with id ${id}:`, packetData);
//       charEventsEmitter.emit('packetInserted', id);
//       return packetData;
//     } catch (error) {
//       console.error('Error inserting packet:', error);
//       throw error;
//     }
//   }

//   // Bulk insert packets
//   static async insertPackets(packets: Packet[]) {
//     try {
//       if (packets.length === 0 || !this.redisClient) return;
//       // Start a transaction
//       const multi = this.redisClient.multi();
//       console.log(
//         'Inserting packets:',
//         packets.map((packet) => packet.id).join(', '),
//         '...'
//       );
//       // Queue commands in the transaction
//       packets.forEach((packet) => {
//         multi.set(`packet:${packet.id}`, JSON.stringify(packet));
//       });

//       // Execute all queued commands atomically
//       await multi.exec();
//     } catch (error) {
//       console.error('Error inserting packets:', error);
//       throw error;
//     }
//   }

//   static async directInsertPackets(packets: Packet[]) {
//     if (packets.length === 0 || !this.redisClient) {
//       return;
//     }

//     try {
//       const multi = this.redisClient.multi();
//       for (const packet of packets) {
//         multi.set(`packet:${packet.id}`, JSON.stringify(packet));
//       }

//       // Execute all queued commands atomically
//       await multi.exec();

//       // Optionally, handle rate limiting to prevent server overload
//       if (this.rateLimit) {
//         await new Promise((resolve) => setTimeout(resolve, this.rateLimit));
//       }

//       // Log the successful insertion and add packet to the channel
//       packets.forEach(async (packet) => {
//         console.log(`Packet directly inserted [id=${packet.id}]`);
//         this.addPacketToStream(packet);
//       });
//     } catch (error) {
//       console.error('Error inserting packets directly:', error);
//       // Handle or rethrow the error as needed
//     }
//   }

//   // Get a specific packet by number
//   static async getPacket(packetNr: number) {
//     try {
//       const packetData = await this.redisClient?.get(`packet:${packetNr}`);
//       console.log(`Retrieved packet with packetNr ${packetNr}:`, packetData);
//       return packetData ? JSON.parse(packetData) : null;
//     } catch (error) {
//       console.error('Error getting packet:', error);
//       throw error;
//     }
//   }

//   // get

//   // This function is not directly transferrable to Redis due to the
//   // differences in how data is stored, but you might implement a
//   // counter in Redis to keep track of total number of packets.
//   static async getPacketCount() {
//     // Need to store packet count separately in Redis or use keys pattern match
//     // Implement this based on the use case
//     console.error('getPacketCount() is not implemented');
//     throw new Error('getPacketCount() is not implemented');
//   }

//   static async clearPackets() {
//     try {
//       console.log('Clearing all packets');
//       if (!this.redisClient) return;

//       // Delete all keys matching 'packet:*'
//       const keys = await this.redisClient.keys('packet:*');
//       if (keys.length === 0) return;

//       const multi = this.redisClient.multi();
//       keys.forEach((key) => {
//         multi.del(key);
//       });

//       await multi.exec();
//       console.log('Cleared all packets.');
//     } catch (error) {
//       console.error('Error clearing packets:', error);
//       throw error;
//     }
//   }

//   static closeRedis() {
//     if (this.redisClient) {
//       this.redisClient.disconnect();
//       this.redisClient = null;
//       console.log('Redis connection closed.');
//     }
//   }
// }
