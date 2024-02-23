import type { Packet } from '../characters/packet.type';
import { AsyncQueue } from './AsyncQueue';

const sqlite3 = require('sqlite3').verbose();
export const db = new sqlite3.Database('./mydatabase.db');

export const packetQueue = new AsyncQueue<Packet>();

export const initDb = () => {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS packets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chunk TEXT,
      charCount INTEGER,
      packetNr INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP);`, 
      (err: Error) => {
        if (err) {
          console.error("Table creation failed", err);
        } else {
          console.log("Table created or already exists");
        }
      });
  });
};


export async function insertPacketIntoDB(packet: Packet) {
  return new Promise<number>((resolve, reject) => {
    // Assuming packet has properties: chunk, charCount, and packetNr
    const { chunk, charCount, packetNr } = packet;
    db.run(
      `INSERT INTO packets (chunk, charCount, packetNr) VALUES (?, ?, ?)`,
      [chunk, charCount, packetNr], // Use the actual properties of `packet`
      function (err: any) {
        // Note: Changed arrow function to regular function to access `this`
        if (err) {
          return reject(err);
        }
        resolve(db.lastID);
      }
    );
  });
}

export async function processPackets(packetQueue: AsyncQueue<Packet>) {
  while (true) {
    try {
      const item = await packetQueue.dequeue(); // This will now wait asynchronously for an item
      await insertPacketIntoDB(item);
      // Processing logic here
    } catch (error) {
      console.error('Error processing packet:', error);
    }
  }
}

export async function getPacket(packetNr: number): Promise<Packet> {
  return new Promise<Packet>((resolve, reject) => {
    db.get(
      `SELECT * FROM packets WHERE packetNr = ?`,
      [packetNr],
      (err: Error | null, row: Packet | undefined) => {
        if (err) {
          reject(err);
        } else if (row === undefined) {
          reject(new Error("No packet found with the provided packetNr"));
        } else {
          resolve(row);
        }
      }
    );
  });
}

