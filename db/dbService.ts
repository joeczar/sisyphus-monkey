import type { Packet } from '../characters/packet.type';
import { AsyncQueue } from './AsyncQueue';

const sqlite3 = require('sqlite3').verbose();
export const db = new sqlite3.Database('./mydatabase.db');

export const packetQueue = new AsyncQueue<Packet>();

export const initDb = db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS packets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chunk TEXT,
    charCount INTEGER,
    packetNr INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP);`);
});

export async function insertPacketIntoDB(message: Packet) {
  return new Promise<number>((resolve, reject) => {
    db.run(
      `INSERT INTO packets (message) VALUES (?)`,
      [message],
      (err: Error) => {
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
