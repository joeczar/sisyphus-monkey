import type { Database } from 'sqlite';
import type { Packet } from '../characters/packet.type';
import { charEventsEmitter } from '../characters/charEvents';

const sqlite3 = require('sqlite3').verbose();
import { open } from 'sqlite';
import { packetNrQueue } from '../characters/printChars';

export class DatabaseService {
  static db: Database | null = null; // Singleton instance variable

  // Private constructor to prevent direct instantiation
  constructor() { }

  // Initialize the database and create tables if they don't exist
  static async initDb() {
    console.log('Initializing database')
    DatabaseService.db = await open({
      filename: './mydatabase.db',
      driver: sqlite3.Database,
    });

    // drop table if exists
    await DatabaseService.db?.exec(`DROP TABLE IF EXISTS packets`);

    await DatabaseService.db?.exec(`
      CREATE TABLE IF NOT EXISTS packets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chunk TEXT NOT NULL,
        charCount INTEGER NOT NULL,
        packetNr INTEGER NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database initialized.');
    return DatabaseService.db;
  }

  // Method for inserting a packet
  static async insertPacket(packet: Packet) {
    const { chunk, charCount, packetNr } = packet;
    const statement = `INSERT INTO packets (chunk, charCount, packetNr) VALUES (?, ?, ?)`;
    const result = await DatabaseService.db?.run(statement, [
      chunk,
      charCount,
      packetNr,
    ]);
    packetNrQueue.enqueue(packetNr);
    charEventsEmitter.emit('packetInserted', packetNr);
    // console.log(
    //   `Inserted packet with packetNr ${packetNr}, ID: ${result?.lastID}`
    // );
    return result;
  }
  static async insertPackets(packets: Packet[]) {
    const placeholders = packets.map(() => "(?, ?, ?)").join(", ");
    const flatValues = packets.flatMap(packet => [packet.chunk, packet.charCount, packet.packetNr]);

    const statement = `INSERT INTO packets (chunk, charCount, packetNr) VALUES ${placeholders}`;

    await DatabaseService.db?.exec('BEGIN TRANSACTION');
    await DatabaseService.db?.run(statement, flatValues);
    await DatabaseService.db?.exec('COMMIT');
  }

  static async getPacket(packetNr: number) {
    try {
      const statement = `SELECT * FROM packets WHERE packetNr = ?`;
      const result = await DatabaseService.db?.get(statement, [packetNr]);
      console.log(`Retrieved packet with packetNr ${packetNr}:`);
      return result;
    } catch (err) {
      console.error('Error getting packet:', err);
      throw err;
    }

  }

  // Method for getting all packets
  static async getAllPackets() {
    try {
      const statement = `SELECT * FROM packets`;
      const result = await DatabaseService.db?.all(statement);
      console.log('Retrieved all packets:', result);
      return result;
    } catch (err) {
      console.error('Error getting all packets:', err);
      throw err;
    }
  }

  // Method for clearing all packets
  static async clearPackets() {
    try {
      console.log('Clearing all packets')
      const statement = `DELETE FROM packets`;
      const result = await DatabaseService.db?.run(statement);
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
