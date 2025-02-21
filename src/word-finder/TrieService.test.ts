/// <reference types="bun-types" />
import { describe, it, expect, beforeAll } from 'bun:test';
import { trieService } from './TrieService';

describe('TrieService', () => {   
  beforeAll(async () => {
    await trieService.initialize();
  });

  it('should correctly identify existing and non-existing words', async () => {
    const testWords = [
      { word: 'apple', exists: true },
      { word: 'book', exists: true },
      { word: 'cat', exists: true },
      { word: 'dog', exists: true },
      { word: 'notarealword123', exists: false },
      { word: 'elephant', exists: true },
      { word: 'fish', exists: true },
    ];

    for (const { word, exists } of testWords) {
      const result = await trieService.findWord(word);
      console.log(`Testing word "${word}": expected ${exists}, got ${result}`);
      expect(result).toBe(exists);
    }
  });

  it('should return words for valid prefixes', async () => {
    const testPrefixes = [
      { prefix: 'app', hasWords: true },
      { prefix: 'cat', hasWords: true },
      { prefix: 'ele', hasWords: true },
      { prefix: 'xyz', hasWords: false },
      { prefix: 'fish', hasWords: true },
    ];

    for (const { prefix, hasWords } of testPrefixes) {
      const words = await trieService.findWordsWithPrefix(prefix);
      console.log(`Testing prefix "${prefix}": found ${words.length} words`);
      expect(words.length > 0).toBe(hasWords);
    }
  });

  it('should handle edge cases', async () => {
    expect(await trieService.findWord('')).toBe(false);
    expect(await trieService.findWord('123')).toBe(false);
    expect(await trieService.findWord('!@#')).toBe(false);
    expect(await trieService.findWord('ApPlE')).toBe(true); // Assuming case-insensitive
  });

  it('should utilize cache efficiently', async () => {
    console.time('First lookup');
    await trieService.findWord('apple');
    console.timeEnd('First lookup');

    console.time('Second lookup');
    await trieService.findWord('apple');
    console.timeEnd('Second lookup');

    trieService.clearCache();

    console.time('After clearing cache');
    await trieService.findWord('apple');
    console.timeEnd('After clearing cache');
  });
});