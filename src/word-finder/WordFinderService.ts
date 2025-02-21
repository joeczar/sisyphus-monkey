import { trieService } from './TrieService';
import { sqliteService } from '../db/SQLiteService';

export class WordFinderService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize both services
    await Promise.all([
      trieService.initialize(),
      sqliteService.initialize()
    ]);

    this.initialized = true;
  }

  async processChunk(content: string, position: number): Promise<string[]> {
    if (!this.initialized) {
      throw new Error('WordFinderService not initialized');
    }

    // Store the chunk first
    const chunkId = await sqliteService.addChunk(content, position);
    const foundWords: string[] = [];

    // Process the chunk character by character
    for (let i = 0; i < content.length; i++) {
      let longestWord = '';
      let longestLength = 0;

      // Try words of different lengths (3 to 15 characters is reasonable)
      for (let length = 3; length <= Math.min(15, content.length - i); length++) {
        const possibleWord = content.slice(i, i + length).toLowerCase();
        
        // Check if it's a valid word using Trie
        if (await trieService.findWord(possibleWord)) {
          // Update longest word found at this position
          if (possibleWord.length > longestLength) {
            longestWord = possibleWord;
            longestLength = possibleWord.length;
          }
        }
      }

      // If we found a word at this position, store the longest one
      if (longestWord) {
        const wordId = await sqliteService.addWord(longestWord, chunkId, i);
        foundWords.push(wordId);
        // Skip ahead to avoid finding subwords of the word we just found
        i += longestLength - 1;
      }
    }

    // Mark chunk as processed
    await sqliteService.markChunkProcessed(chunkId);

    return foundWords;
  }

  async getUnprocessedChunks() {
    return sqliteService.getUnprocessedChunks();
  }

  async getUnusedWords() {
    return sqliteService.getUnusedWords();
  }

  async reset(): Promise<void> {
    await Promise.all([
      sqliteService.reset(),
      trieService.clearCache()
    ]);
    this.initialized = false;
  }
}

// Export singleton instance
export const wordFinderService = new WordFinderService(); 