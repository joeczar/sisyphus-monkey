
import type { Packet } from '../characters/packet.type';
import { AsyncQueue } from './AsyncQueue';
import { EventEmitter } from 'events';


interface RunResult {
  lastID: number;
  changes: number;
}

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./mydatabase.db');

export const dbEmitter = new EventEmitter();
export const packetQueue = new AsyncQueue<Packet>();

// Initialize and open the database connection using sqlite wrapper with Promises


export const dbConnected = async (): Promise<boolean> => {
  try {

    console.info('Database connected');
    const row = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='packets';");
    return row !== undefined;
  } catch (err) {
    console.error('Error connecting to the database', err);
    throw err;
  }
};

export const initDbChar = async (): Promise<void> => {
  try {
    await db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS packets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
    });
    console.log('Table created or already exists');
  } catch (err) {
    console.error('Table creation failed', err);
    throw err; // Add proper error handling if needed
  }
};
export async function initializeDatabase() {
  try {

    // Connect to the database and create the `db` object.
    await dbConnected();

    // Now that `db` is initialized, you can create tables or perform other operations.
    await initDbChar();
    return db
  } catch (err) {
    console.error('Error initializing the database:', err);
    // Handle error appropriately - you may want to halt the application if database setup fails
    process.exit(1);
  }
}
export function saveCharPacket(packet: Packet): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const { chunk, charCount, packetNr } = packet;

    db.run(
      `INSERT INTO packets (chunk, charCount, packetNr) VALUES (?, ?, ?)`,
      [chunk, charCount, packetNr], // Use the actual properties of `packet`
      function(this: any, err: Error | null) { // Note: Changed arrow function to regular function to access `this`
        if (err) {
          console.error('Error saving packet:', packet.packetNr, err);
          reject(err);
        } else {
          console.log('Packet saved:', packet.packetNr, this.lastID);
          dbEmitter.emit('packetSaved', packet.packetNr);
          resolve(this.lastID);
        }
      }
    );
  });
}




export async function getPacket(packetNr: number): Promise<Packet | undefined> {
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

// export async function clearDb(): Promise<void> {
//   try {
//     await db.exec(`DELETE FROM packets`);
//   } catch (err) {
//     console.error('Error clearing the packets table:', err);
//     throw err; // Add proper error handling if needed
//   }
// }

// export async function closeDb(): Promise<void> {
//   try {
//     await db.close();
//     console.log('Database connection closed');
//   } catch (err) {
//     console.error('Error closing the database:', err);
//     throw err; // Add proper error handling if needed
//   }
// }
