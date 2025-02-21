/// <reference types="bun-types" />
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import type { DictionaryByLetter } from '../word-finder/types';

async function fetchDictionary(): Promise<DictionaryByLetter> {
  const response = await fetch('https://raw.githubusercontent.com/matthewreagan/WebstersEnglishDictionary/refs/heads/master/dictionary_alpha_arrays.json');
  if (!response.ok) throw new Error(`Failed to fetch dictionary: ${response.statusText}`);
  const data = await response.json();
  
  // Convert numeric keys to letters
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  return Object.fromEntries(
    Object.entries(data).map(([key, value], index) => [letters[index], value])
  ) as DictionaryByLetter;
}

async function ensureDirectoryExists(path: string) {
  try {
    await mkdir(path, { recursive: true });
  } catch (error) {
    if ((error as any).code !== 'EEXIST') throw error;
  }
}

async function processDictionary() {
  try {
    console.log('Fetching dictionary...');
    const dictionary = await fetchDictionary();

    const outputDir = join(process.cwd(), 'src', 'word-finder', 'dictionary');
    await ensureDirectoryExists(outputDir);

    const indexContent = Object.keys(dictionary)
      .map(letter => `export { default as ${letter}Dictionary } from './${letter}';`)
      .join('\n');

    await Bun.write(join(outputDir, 'index.ts'), indexContent + '\n');

    for (const [letter, words] of Object.entries(dictionary)) {
      console.log(`Processing letter ${letter}...`);
      const content = `// Auto-generated dictionary file for letter '${letter}'
import type { AlphabeticalDictionary } from '../types';

const dictionary: AlphabeticalDictionary = ${JSON.stringify(words, null, 2)};

export default dictionary;`;

      await Bun.write(join(outputDir, `${letter}.ts`), content);
    }

    console.log('Dictionary processing complete!');
  } catch (error) {
    console.error('Failed to process dictionary:', error);
    process.exit(1);
  }
}

processDictionary();