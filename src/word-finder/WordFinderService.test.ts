/// <reference types="bun-types" />
import { describe, it, expect, beforeEach, afterAll } from 'bun:test';
import { wordFinderService } from './WordFinderService';
import { sqliteService } from '../db/SQLiteService';
import { unlink } from 'node:fs/promises';

describe('WordFinderService', () => {
  beforeEach(async () => {
    // Reset services before each test
    await wordFinderService.reset();
    await wordFinderService.initialize();
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

  it('should find and store words and subwords from a chunk', async () => {
    // Process a chunk with known words
    const chunk = 'theprogrammerwritescode';
    const wordIds = await wordFinderService.processChunk(chunk, 1);

    // Verify words were found
    expect(wordIds.length).toBeGreaterThan(0);

    // Get the stored words
    const storedWords = await sqliteService.getUnusedWords();
    const wordValues = new Set(storedWords.map(w => w.value));
    
    // Core words that must be present
    const expectedWords = ['the', 'program', 'write', 'code'];
    for (const word of expectedWords) {
      expect(wordValues.has(word)).toBe(true);
    }

    // Log all found words for reference
    console.log('Found words:', Array.from(wordValues).sort());
    
    // Verify we found a reasonable number of words
    expect(wordValues.size).toBeGreaterThan(expectedWords.length);
  });

  it('should mark chunks as processed', async () => {
    // Process a chunk
    await wordFinderService.processChunk('testchunk', 1);

    // Check unprocessed chunks
    const unprocessedChunks = await wordFinderService.getUnprocessedChunks();
    expect(unprocessedChunks.length).toBe(0);
  });

  it('should handle multiple chunks', async () => {
    // Process multiple chunks
    await wordFinderService.processChunk('firstchunk', 1);
    await wordFinderService.processChunk('secondchunk', 2);

    // Get all stored words
    const storedWords = await sqliteService.getUnusedWords();
    const wordValues = new Set(storedWords.map(w => w.value));
    
    // Verify core words from both chunks
    expect(wordValues.has('first')).toBe(true);
    expect(wordValues.has('second')).toBe(true);
    
    // Log all found words
    console.log('Found words from chunks:', Array.from(wordValues).sort());
  });

  it('should handle reset properly', async () => {
    // Add some data
    await wordFinderService.processChunk('testdata', 1);

    // Reset
    await wordFinderService.reset();
    await wordFinderService.initialize();

    // Verify clean state
    const unprocessedChunks = await wordFinderService.getUnprocessedChunks();
    const unusedWords = await wordFinderService.getUnusedWords();

    expect(unprocessedChunks.length).toBe(0);
    expect(unusedWords.length).toBe(0);
  });
}); 