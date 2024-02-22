import { Trie } from './Trie';

import * as fs from 'fs/promises';

export async function createTrieAndSaveToFile(
  wordsSet: Set<string>,
  filePath: string
): Promise<void> {
  const trie = new Trie();
  wordsSet.forEach((word) => trie.insert(word));

  const serializedTrie = trie.serialize();
  try {
    await fs.writeFile(filePath, JSON.stringify(serializedTrie, null, 2));
    console.log(
      'Trie structure has been serialized and saved to file successfully.'
    );
  } catch (error) {
    console.error('Error writing trie to file:', error);
  }
}

export function searchSerializedTrie(
  serializedTrie: any,
  word: string
): boolean {
  let node = serializedTrie;
  for (const char of word) {
    if (!node[char]) {
      return false; // Character path not found, word doesn't exist
    }
    node = node[char]; // Move to the next character in the Trie
  }
  return node.hasOwnProperty('isEndOfWord'); // Check if the path ends with a complete word
}
