/// <reference types="bun-types" />
import { describe, it, expect, beforeEach, afterAll } from 'bun:test';
import { wordPacketService } from './WordPacketService';
import { wordFinderService } from './WordFinderService';
import { sqliteService } from '../db/SQLiteService';
import { unlink } from 'node:fs/promises';

describe('WordPacketService', () => {
  beforeEach(async () => {
    // Reset services before each test
    await wordPacketService.reset();
    await wordFinderService.reset();
    
    // Initialize services
    await Promise.all([
      wordPacketService.initialize(),
      wordFinderService.initialize()
    ]);
  });

  afterAll(async () => {
    // Clean up test database
    await sqliteService.close();
    try {
      await unlink('words.db');
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  it('should create packets from found words', async () => {
    // First find some words
    const chunk = 'theprogrammerwritescodeandtestsinthemorning';
    await wordFinderService.processChunk(chunk, 1);

    // Create packets
    const packetIds = await wordPacketService.createPackets({
      minSize: 3,  // Smaller size for testing
      maxSize: 5
    });

    // Verify packets were created
    expect(packetIds.length).toBeGreaterThan(0);

    // Get unprocessed packets
    const packets = await wordPacketService.getUnprocessedPackets();
    expect(packets.length).toBe(packetIds.length);

    // Log packet information
    for (const packet of packets) {
      console.log(`Packet ${packet.sequence} with ${packet.word_count} words`);
    }
  });

  it('should respect minimum packet size', async () => {
    // Add just a few words
    await wordFinderService.processChunk('thecat', 1);

    // Try to create packets with larger minimum size
    const packetIds = await wordPacketService.createPackets({
      minSize: 5
    });

    // Should not create any packets
    expect(packetIds.length).toBe(0);
  });

  it('should handle multiple chunks of words', async () => {
    // Add words from multiple chunks
    await wordFinderService.processChunk('theprogrammer', 1);
    await wordFinderService.processChunk('writescodein', 2);
    await wordFinderService.processChunk('themorning', 3);

    // Create packets with default settings
    const packetIds = await wordPacketService.createPackets();

    // Verify packets
    const packets = await wordPacketService.getUnprocessedPackets();
    expect(packets.length).toBeGreaterThan(0);

    // Log packet details
    console.log('Created packets:');
    for (const packet of packets) {
      console.log(`- Packet ${packet.sequence}: ${packet.word_count} words`);
    }
  });

  it('should maintain packet sequence', async () => {
    // Add some words
    await wordFinderService.processChunk('theprogrammerwritescode', 1);

    // Create two batches of packets
    const firstBatch = await wordPacketService.createPackets({ maxSize: 3 });
    const secondBatch = await wordPacketService.createPackets({ maxSize: 3 });

    // Get all packets
    const allPackets = await wordPacketService.getUnprocessedPackets();
    
    // Verify sequence numbers are in order
    const sequences = allPackets.map(p => p.sequence);
    const sortedSequences = [...sequences].sort((a, b) => a - b);
    expect(sequences).toEqual(sortedSequences);

    // Log sequence information
    console.log('Packet sequences:', sequences);
    console.log('Word counts:', allPackets.map(p => p.word_count));
  });
}); 