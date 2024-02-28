import { AsyncQueue } from '../db/AsyncQueue';
import { DatabaseService } from '../db/database';
import type { Packet } from './packet.type';
import { charEventsEmitter } from './charEvents';

export const packetNrQueue = new AsyncQueue<number>();

let isFirstEvent = true;
charEventsEmitter.on('packetInserted', () => {
  if (isFirstEvent) {
    processPacketNrQueue();
    isFirstEvent = false;
  }
})

// Function to print a single packet's characters
const printPacketChars = async (packet: Packet) => {
  const printChunkSize = 180; // Adjust this to control how many characters are printed at a time
  const printDelayMs = 0; // Adjust this to control the delay between chunks

  console.log("Printing Chars for packetNr:", packet.packetNr);
  const { chunk } = packet;
  if (!chunk) {
    console.error('No chunk found in packet:', packet);
    return;
  }

  for (let i = 0; i < chunk.length; i += printChunkSize) {
    const chunkToPrint = chunk.substring(i, i + printChunkSize);
    process.stdout.write(chunkToPrint);

    // Only delay if there are more characters to print
    if (i + printChunkSize < chunk.length) {
      await new Promise((resolve) => setTimeout(resolve, printDelayMs));
    }
  }
};

async function processPacket(packetNr: number) {
  try {
    const packet = await DatabaseService.getPacket(packetNr);
    if (packet === undefined) {
      console.error(`Packet not found for packetNr: ${packetNr}`);
      return;
    }
    await printPacketChars(packet);
  } catch (err) {
    console.error('Error in processPacket', err);
  }
}

// Function to continuously process packet numbers from the queue
export const processPacketNrQueue = async () => {
  console.log('Starting processPacketNrQueue')
  while (true) {
    try {
      const isEmpty = packetNrQueue.isEmpty();
      console.log('isEmpty:', isEmpty)
      if (isEmpty) {
        console.log('Queue is empty, waiting for 1 second');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      const packetNr = await packetNrQueue.dequeue(); // Wait for a packet number to be dequeued.
      console.log('Dequeued packetNr:', packetNr);
      if (packetNr !== undefined) {
        // Process the dequeued packet number only if it's not undefined
        await processPacket(packetNr);
      } else {
        console.error(`Dequeued undefined packet number`);
      }

    } catch (err) {
      console.error('Error in processPacketNrQueue', err);
    }
  }
};
