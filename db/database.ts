import type { Database } from 'sqlite';
import type { Packet } from '../characters/packet.type';
import { AsyncQueue } from './AsyncQueue';
import { charEventsEmitter } from '../characters/charEvents';

const sqlite3 = require('sqlite3').verbose();
import { open } from 'sqlite';
import { packetNrQueue } from '../characters/printChars';

export class DatabaseService {
  static lastEnqueueTime = 0;
  static enqueueRateLimit = 10000;

  static db: Database | null = null; // Singleton instance variable

  static insertionQueue: AsyncQueue<() => Promise<void>> = new AsyncQueue(500);

  static async enqueueInsertion(insertFunction: () => Promise<void>) {
    this.insertionQueue.enqueue(() => insertFunction());
    this.processQueueIfNeeded();
  }

  static async processQueueIfNeeded() {
    // Start processing the queue if it hasn't started yet
    if (this.insertionQueue.getHasStarted()) {
      return;
    }
    this.insertionQueue.setHasStarted(true);
    while (!this.insertionQueue.isEmpty()) {
      const insertFunction = await this.insertionQueue.dequeue();
      await insertFunction();
    }
    this.insertionQueue.setHasStarted(false);
    // this.insertionQueue.close();
  }
  // Private constructor to prevent direct instantiation
  constructor() {}

  // Initialize the database and create tables if they don't exist
  static async initDb() {
    try {
      console.log('Initializing database...');

      this.db = await open({
        filename: './mydatabase.db',
        driver: sqlite3.Database,
      });

      await this.db.exec('BEGIN');

      // Drop tables if they exist to clean the slate
      await this.db.exec(`DROP TABLE IF EXISTS packets;`);

      // Create new tables
      await this.db.exec(`
        CREATE TABLE packets (
          id INTEGER PRIMARY KEY NOT NULL,
          content TEXT NOT NULL,
          charCount INTEGER NOT NULL,
          source TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await this.db.exec('COMMIT');

      console.log('Database initialization completed.');
      return this.db;
    } catch (error) {
      console.log('Database initialization failed:', error);
      if (this.db) {
        try {
          await this.db.exec('ROLLBACK');
        } catch (rollbackError) {
          console.log('Rollback failed:', rollbackError);
        }
      }
      throw error; // Re-throw the error to the caller
    }
  }
  static async performTransaction(actions: () => Promise<void>) {
    let isTransactionActive = false;

    try {
      await this.db?.run('BEGIN');
      isTransactionActive = true;

      // Execute the actions provided in the callback function
      await actions();

      await this.db?.run('COMMIT');
      isTransactionActive = false;
    } catch (error) {
      if (isTransactionActive) {
        await this.db?.run('ROLLBACK');
      }
      throw error;
    }
  }

  // Method for inserting a packet
  static async insertPacket(packet: Packet) {
    try {
      const { content, charCount, id, source, timestamp } = packet;
      const statement = `INSERT INTO packets (content, charCount, id, source, timestamp) VALUES (?, ?, ?, ?, ?);`;
      const result = await this.db?.run(statement, [
        content,
        charCount,
        id,
        source,
        timestamp,
      ]);
      packetNrQueue.enqueue(id);
      charEventsEmitter.emit('packetInserted', id);
      console.log(`Inserted packet with packetNr ${id}, ID: ${result?.lastID}`);
      return result;
    } catch (error) {
      console.error('Error Inserting packer', error);
      throw error;
    }
  }
  static async insertPackets(packets: Packet[]) {
    try {
      if (packets.length === 0) return; // Avoid empty inserts

      const placeholders = packets.map(() => '(?, ?, ?, ?, ?)').join(', ');
      const flatValues = packets.flatMap((packet) => [
        packet.content,
        packet.charCount,
        packet.id,
        packet.source,
        packet.timestamp,
      ]);

      const statement = `INSERT INTO packets (content, charCount, id, source, timestamp) VALUES ${placeholders}`;

      await this.performTransaction(async () => {
        await this.db?.run(statement, flatValues);
      });
    } catch (error) {
      console.error('Error in insert Packets', error);
      throw error;
    }
  }
  static async enqueuePackets(packets: Packet[]) {
    try {
      console.log(
        'Enqueueing packets:',
        packets.map((packet) => packet.id).join(', ')
      );
      const now = Date.now();
      const delay = this.lastEnqueueTime + this.enqueueRateLimit - now;
      if (delay > 0) {
        await new Promise((res) => setTimeout(res, delay));
      }
      this.lastEnqueueTime = Date.now();
      this.enqueueInsertion(() => this.insertPackets(packets));
    } catch (error) {
      console.error('Error in enqueuePackets', error);
      throw error;
    }
  }

  static async getPacket(id: number) {
    try {
      const statement = `SELECT * FROM packets WHERE id = ?`;
      const result = await this.db?.get(statement, [id]);
      console.log(`Retrieved packet with id ${id}:`);
      return result;
    } catch (err) {
      console.error('Error getting packet:', err);
      throw err;
    }
  }

  static async getPacketCount() {
    try {
      const statement = `SELECT COUNT(*) AS count FROM packets`;
      const result = await this.db?.get(statement);
      console.log(`Total number of packets: ${result.count}`);
      return result.count;
    } catch (err) {
      console.error('Error getting the packet count:', err);
      throw err;
    }
  }

  // Method for clearing all packets
  static async clearPackets() {
    try {
      console.log('Clearing all packets');
      const statement = `DELETE FROM packets`;
      const result = await this.db?.run(statement);
      console.log('Cleared all packets:', result);
      return result;
    } catch (err) {
      console.error('Error clearing all packets:', err);
      throw err;
    }
  }

  // Close the database when done
  static closeDb() {
    if (DatabaseService.db) {
      DatabaseService.db.close();
      DatabaseService.db = null;
      console.log('Database connection closed.');
    }
  }
}
