import type { Packet } from '../characters/packet.type';
import { AsyncQueue } from './AsyncQueue';

const sqlite3 = require('sqlite3').verbose();
export const db = new sqlite3.Database('./mydatabase.db');

export const packetQueue = new AsyncQueue<Packet>();

export const initDb = () =>
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS packets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chunk TEXT,
    charCount INTEGER,
    packetNr INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP);`);
  });

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

export async function getPacket(packetNr:number) {
  return new Promise<Packet>((resolve, reject) => {
    db.get(
      `SELECT * FROM packets WHERE packetNr = ?`,
      [packetNr],
      (err: any, row: Packet) => {
        if (err) {
          return reject(err);
        }
        resolve(row);
      }
    );
  });
}

/**
 * there should always be 2 packets being parsed to make sureany words across their boundaries are captured, they also need to be in order
 * thier length are noted in the charCount property. When we have parsed the boundry we can drop the first and pull in the next one
 */
export async function pullPacketsForParsing(startingNumber = 0) {
  let packets = [];
  let packet = await getPacket(startingNumber);
  let nextPacket = await getPacket(startingNumber + 1);
  while (packet && nextPacket) {
    packets.push(packet);
    if (packets.reduce((acc, packet) => acc + packet.charCount, 0) >= 1000) {
      break;
    }
    packets.shift();
    packet = nextPacket;
    nextPacket = await getPacket(packet.packetNr + 1);
  }
  return packets;


}
}