export interface DictionaryWord {
  word: string;
  definition: string;
}

export interface AlphabeticalDictionary {
  [word: string]: string;
}

export interface WordMatch {
  word: string;
  position: number;
  definition?: string;
}

// Type for each letter's dictionary file
export type DictionaryLetter = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' 
  | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z';

// Type for the dictionary split by letter
export type DictionaryByLetter = {
  [K in DictionaryLetter]: AlphabeticalDictionary;
} 