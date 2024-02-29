import type { Database } from "sqlite";
import type { Packet } from "../characters/packet.type";
import { AsyncQueue } from "./AsyncQueue";
import { charEventsEmitter } from "../characters/charEvents";

const sqlite3 = require("sqlite3").verbose();
import { open } from "sqlite";
import { packetNrQueue } from "../characters/printChars";

export class DatabaseService {
  static db: Database | null = null; // Singleton instance variable

  static insertionQueue: AsyncQueue<() => Promise<void>> = new AsyncQueue();

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
  }
  // Private constructor to prevent direct instantiation
  constructor() {}

  // Initialize the database and create tables if they don't exist
  static async initDb() {
    try {
      console.log("Initializing database...");

      this.db = await open({
        filename: "./mydatabase.db",
        driver: sqlite3.Database,
      });

      await this.db.exec("BEGIN");

      // Drop tables if they exist to clean the slate
      await this.db.exec(`DROP TABLE IF EXISTS packets;`);

      // Create new tables
      await this.db.exec(`
        CREATE TABLE packets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chunk TEXT NOT NULL,
          charCount INTEGER NOT NULL,
          packetNr INTEGER NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await this.db.exec("COMMIT");

      console.log("Database initialization completed.");
      return this.db;
    } catch (error) {
      console.log("Database initialization failed:", error);
      if (this.db) {
        try {
          await this.db.exec("ROLLBACK");
        } catch (rollbackError) {
          console.log("Rollback failed:", rollbackError);
        }
      }
      throw error; // Re-throw the error to the caller
    }
  }
  static async performTransaction(actions: () => Promise<void>) {
    let isTransactionActive = false;

    try {
      await this.db?.run("BEGIN");
      isTransactionActive = true;

      // Execute the actions provided in the callback function
      await actions();

      await this.db?.run("COMMIT");
      isTransactionActive = false;
    } catch (error) {
      if (isTransactionActive) {
        await this.db?.run("ROLLBACK");
      }
      throw error;
    }
  }

  // Method for inserting a packet
  static async insertPacket(packet: Packet) {
    const { chunk, charCount, packetNr } = packet;
    const statement = `INSERT INTO packets (chunk, charCount, packetNr) VALUES (?, ?, ?)`;
    const result = await this.db?.run(statement, [chunk, charCount, packetNr]);
    packetNrQueue.enqueue(packetNr);
    charEventsEmitter.emit("packetInserted", packetNr);
    // console.log(
    //   `Inserted packet with packetNr ${packetNr}, ID: ${result?.lastID}`
    // );
    return result;
  }
  static async insertPackets(packets: Packet[]) {
    if (packets.length === 0) return; // Avoid empty inserts

    const placeholders = packets.map(() => "(?, ?, ?)").join(", ");
    const flatValues = packets.flatMap((packet) => [
      packet.chunk,
      packet.charCount,
      packet.packetNr,
    ]);

    const statement = `INSERT INTO packets (chunk, charCount, packetNr) VALUES ${placeholders}`;

    // Use the performTransaction method to handle the transaction
    await this.performTransaction(async () => {
      await this.db?.run(statement, flatValues);
    });
  }
  static async enqueuePackets(packets: Packet[]) {
    this.enqueueInsertion(() => this.insertPackets(packets));
  }

  static async getPacket(packetNr: number) {
    try {
      const statement = `SELECT * FROM packets WHERE packetNr = ?`;
      const result = await this.db?.get(statement, [packetNr]);
      console.log(`Retrieved packet with packetNr ${packetNr}:`);
      return result;
    } catch (err) {
      console.error("Error getting packet:", err);
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
      console.error("Error getting the packet count:", err);
      throw err;
    }
  }

  // Method for clearing all packets
  static async clearPackets() {
    try {
      console.log("Clearing all packets");
      const statement = `DELETE FROM packets`;
      const result = await this.db?.run(statement);
      console.log("Cleared all packets:", result);
      return result;
    } catch (err) {
      console.error("Error clearing all packets:", err);
      throw err;
    }
  }

  // Close the database when done
  static closeDb() {
    if (DatabaseService.db) {
      DatabaseService.db.close();
      DatabaseService.db = null;
      console.log("Database connection closed.");
    }
  }
}
