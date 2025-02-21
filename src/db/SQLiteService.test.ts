/// <reference types="bun-types" />
import { describe, it, expect, beforeEach, afterAll } from 'bun:test';
import { SQLiteService } from './SQLiteService';
import { unlink } from 'node:fs/promises';

describe('SQLiteService', () => {
  const TEST_DB = 'test.db';
  let db: SQLiteService;

  beforeEach(async () => {
    // Clean up any existing database
    try {
      await unlink(TEST_DB);
    } catch (error) {
      // Ignore if file doesn't exist
    }
    
    // Use a fresh test database
    db = new SQLiteService(TEST_DB);
    await db.initialize();
  });

  afterAll(async () => {
    await db.close();
    // Clean up test database
    try {
      await unlink(TEST_DB);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  it('should handle the complete word discovery flow', async () => {
    // 1. Add a chunk
    const chunkId = await db.addChunk('hello world program', 1);
    expect(chunkId).toBeTruthy();

    // 2. Add words from chunk
    const word1Id = await db.addWord('hello', chunkId, 0);
    const word2Id = await db.addWord('world', chunkId, 6);
    const word3Id = await db.addWord('program', chunkId, 12);

    // 3. Create a word packet
    const packetId = await db.createWordPacket([word1Id, word2Id, word3Id], 1);
    expect(packetId).toBeTruthy();

    // 4. Create a poem
    const poemId = await db.addPoem('Hello world program poem', 'haiku', packetId, 1);
    expect(poemId).toBeTruthy();

    // 5. Trace word origins
    const origins = await db.getWordOrigins(poemId);
    expect(origins.length).toBe(3);
    expect(origins[0].word).toBe('hello');
    expect(origins[1].word).toBe('world');
    expect(origins[2].word).toBe('program');
    expect(origins[0].chunk).toBe('hello world program');
  });

  it('should track unprocessed chunks', async () => {
    // Add two chunks
    const chunk1Id = await db.addChunk('first chunk', 1);
    const chunk2Id = await db.addChunk('second chunk', 2);

    // Get unprocessed chunks
    let unprocessed = await db.getUnprocessedChunks();
    expect(unprocessed.length).toBe(2);

    // Mark one as processed
    await db.markChunkProcessed(chunk1Id);

    // Check unprocessed again
    unprocessed = await db.getUnprocessedChunks();
    expect(unprocessed.length).toBe(1);
    expect(unprocessed[0].content).toBe('second chunk');
  });

  it('should track unused words', async () => {
    // Add a chunk and words
    const chunkId = await db.addChunk('test chunk', 1);
    const word1Id = await db.addWord('test', chunkId, 0);
    const word2Id = await db.addWord('chunk', chunkId, 5);

    // Check unused words
    let unused = await db.getUnusedWords();
    expect(unused.length).toBe(2);

    // Use one word in a packet
    await db.createWordPacket([word1Id], 1);

    // Check unused words again
    unused = await db.getUnusedWords();
    expect(unused.length).toBe(1);
    expect(unused[0].value).toBe('chunk');
  });

  it('should handle reset operation', async () => {
    // Add some data
    const chunkId = await db.addChunk('test data', 1);
    const wordId = await db.addWord('test', chunkId, 0);
    const packetId = await db.createWordPacket([wordId], 1);
    await db.addPoem('Test poem', 'haiku', packetId, 1);

    // Reset database
    await db.reset();

    // Verify everything is cleared
    const chunks = await db.getUnprocessedChunks();
    const unused = await db.getUnusedWords();
    const packets = await db.getUnprocessedPackets();
    const poems = await db.getPoemsByIteration(1);

    expect(chunks.length).toBe(0);
    expect(unused.length).toBe(0);
    expect(packets.length).toBe(0);
    expect(poems.length).toBe(0);
  });
}); 