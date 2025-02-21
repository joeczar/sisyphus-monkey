/// <reference types="bun-types" />
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { Trie } from '../utils/Trie';
import type { DictionaryLetter } from '../word-finder/types';

// Import all letter dictionaries
const letters: DictionaryLetter[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];

async function ensureDirectoryExists(path: string) {
  try {
    await mkdir(path, { recursive: true });
  } catch (error) {
    if ((error as any).code !== 'EEXIST') throw error;
  }
}

async function generateTrieForLetter(letter: DictionaryLetter) {
  console.log(`Processing letter ${letter}...`);
  
  // Dynamically import the dictionary for this letter
  const { default: dictionary } = await import(`../word-finder/dictionary/${letter}`);
  
  // Create and populate Trie
  const trie = new Trie();
  Object.keys(dictionary).forEach(word => trie.insert(word));
  
  // Serialize and save
  const serializedTrie = trie.serialize();
  const triesDir = join(process.cwd(), 'src', 'word-finder', 'tries');
  await Bun.write(
    join(triesDir, `${letter}.json`),
    JSON.stringify(serializedTrie, null, 2)
  );
  
  console.log(`Completed Trie for letter ${letter}`);
  return { letter, wordCount: Object.keys(dictionary).length };
}

async function generateAllTries() {
  try {
    console.log('Starting Trie generation...');
    
    // Ensure tries directory exists
    const triesDir = join(process.cwd(), 'src', 'word-finder', 'tries');
    await ensureDirectoryExists(triesDir);
    
    // Process all letters in parallel
    const results = await Promise.all(
      letters.map(letter => generateTrieForLetter(letter))
    );
    
    // Log summary
    console.log('\nTrie Generation Summary:');
    results.forEach(({ letter, wordCount }) => {
      console.log(`${letter}: ${wordCount} words`);
    });
    
    console.log('\nTrie generation complete!');
  } catch (error) {
    console.error('Failed to generate tries:', error);
    process.exit(1);
  }
}

// Run the script
generateAllTries(); 