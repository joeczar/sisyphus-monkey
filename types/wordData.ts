export type WordData = {
  word: string;
  packetNr: number;
  position: { start: number; end: number };
  wordNr: number;
  chars: number;
  meaning?: Meaning | Meaning[];;
  metadata?: any[];
};

export type BoundaryWordData = WordData & {
  nextPacketNr: number;
};

export type WordDataPacket = {
  wordData: WordData[];
  nextPacketNr: number;
};

export type Definition = {
  definition: string;
  example: string;
  synonyms: string[];
  antonyms: string[];
};
export type Meaning = {
  partOfSpeech: string;
  definitions: Definition[];
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
