import { join } from 'node:path';
import { Trie } from '../utils/Trie';
import type { DictionaryLetter } from './types';

export class TrieService {
  private tries: Map<DictionaryLetter, Trie> = new Map();
  private loadingPromises: Map<DictionaryLetter, Promise<Trie>> = new Map();
  private initialized: boolean = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    // Pre-warm cache with a few common letters
    await Promise.all([
      this.getTrie('a'),
      this.getTrie('e'),
      this.getTrie('i'),
      this.getTrie('o'),
      this.getTrie('s')
    ]);
    this.initialized = true;
  }

  private async loadTrie(letter: DictionaryLetter): Promise<Trie> {
    // Check if already loading
    const existingPromise = this.loadingPromises.get(letter);
    if (existingPromise) return existingPromise;

    const loadPromise = (async () => {
      try {
        // Load serialized Trie from file
        const triePath = join(process.cwd(), 'src', 'word-finder', 'tries', `${letter}.json`);
        const data = await Bun.file(triePath).json();
        
        // Create and deserialize Trie
        const trie = new Trie();
        trie.deserialize(data);
        
        // Store in cache and cleanup loading promise
        this.tries.set(letter, trie);
        this.loadingPromises.delete(letter);
        
        return trie;
      } catch (error) {
        this.loadingPromises.delete(letter);
        throw new Error(`Failed to load Trie for letter ${letter}: ${error}`);
      }
    })();

    this.loadingPromises.set(letter, loadPromise);
    return loadPromise;
  }

  async getTrie(letter: DictionaryLetter): Promise<Trie> {
    // Return cached Trie if available
    const cachedTrie = this.tries.get(letter);
    if (cachedTrie) return cachedTrie;

    // Load and return new Trie
    return this.loadTrie(letter);
  }

  async findWord(word: string): Promise<boolean> {
    if (!word) return false;
    
    const firstLetter = word[0].toLowerCase() as DictionaryLetter;
    if (!/^[a-z]$/.test(firstLetter)) return false;

    const trie = await this.getTrie(firstLetter);
    return trie.search(word.toLowerCase());
  }

  async findWordsWithPrefix(prefix: string): Promise<string[]> {
    if (!prefix) return [];
    
    const firstLetter = prefix[0].toLowerCase() as DictionaryLetter;
    if (!/^[a-z]$/.test(firstLetter)) return [];

    const trie = await this.getTrie(firstLetter);
    return trie.getAllWordsWithPrefix(prefix.toLowerCase());
  }

  clearCache(): void {
    this.tries.clear();
    this.loadingPromises.clear();
    this.initialized = false;
  }
}

// Export singleton instance
export const trieService = new TrieService(); 