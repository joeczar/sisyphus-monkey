import { readFile } from 'fs/promises';
import { join } from 'path';
import type { DictionaryData, DictionaryWord } from './types';

class Dictionary {
  private words: Set<string> = new Set();
  private definitions: Map<string, string> = new Map();
  private isLoaded: boolean = false;

  async load(): Promise<void> {
    if (this.isLoaded) return;

    try {
      // Read dictionary file
      const dictionaryPath = join(process.cwd(), 'data', 'dictionary', 'dictionary.json');
      const data = await readFile(dictionaryPath, 'utf-8');
      const dictionary: DictionaryData = JSON.parse(data);

      // Load words and definitions
      Object.entries(dictionary).forEach(([word, definition]) => {
        this.words.add(word.toLowerCase());
        this.definitions.set(word.toLowerCase(), definition);
      });

      this.isLoaded = true;
      console.log(`Dictionary loaded with ${this.words.size} words`);
    } catch (error) {
      console.error('Failed to load dictionary:', error);
      throw error;
    }
  }

  isWord(word: string): boolean {
    if (!this.isLoaded) throw new Error('Dictionary not loaded');
    return this.words.has(word.toLowerCase());
  }

  getDefinition(word: string): string | undefined {
    if (!this.isLoaded) throw new Error('Dictionary not loaded');
    return this.definitions.get(word.toLowerCase());
  }

  getWordCount(): number {
    return this.words.size;
  }
}

// Export singleton instance
export const dictionary = new Dictionary(); 