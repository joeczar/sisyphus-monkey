import { wordsSet } from '../utils/wordsSet';
import { createTrieAndSaveToFile } from './trieService';

const filePath = './trie.json';

createTrieAndSaveToFile(wordsSet, filePath);
