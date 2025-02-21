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
      // Try words of different lengths (3 to 15 characters is reasonable)
      for (let length = 3; length <= Math.min(15, content.length - i); length++) {
        const possibleWord = content.slice(i, i + length).toLowerCase();
        
        // Check if it's a valid word using Trie
        if (await trieService.findWord(possibleWord)) {
          // Store the word and its position
          const wordId = await sqliteService.addWord(possibleWord, chunkId, i);
          foundWords.push(wordId);
        }
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