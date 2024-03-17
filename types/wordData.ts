export type Position = {
  start: number;
  end: number;
};

export type Definition = {
  definition: string;
  synonyms: string[];
  antonyms: string[];
  example?: string; // Optional
};

export type Meaning = {
  partOfSpeech: string;
  definitions: Definition[];
  synonyms: string[];
  antonyms: string[];
};

export type Metadata = {
  type: string;
  associatedConcepts: string[];
  images: string[];
  sounds: string[];
  feelings: string[];
  relatedColors: string[];
  relatedNaturalElements: string[];
};

export type WordData = {
  word: string;
  packetNr: number;
  position: Position;
  wordNr: number;
  chars: number;
  meaning?: Meaning[]; // Assuming a word can have multiple meanings
  metadata?: Metadata[];
  trash?: boolean;
};

export type BoundaryWordData = WordData & {
  nextPacketNr: number;
};

export type WordNodePacket = {
  wordNode: WordData[];
  nextPacketNr: number;
};

export type Phonetic = {
  text: string;
  audio?: string;
};

export type WordDefinition = {
  word: string;
  phonetic: string;
  phonetics: Phonetic[];
  origin: string;
  meanings: Meaning[];
};
