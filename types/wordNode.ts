export type WordNode = {
  word: string;
  packetNr: number;
  wordNr: number;
  chars: number;
  position: Position;
  // utility - not for nodes
  trash?: boolean;
  // Relationships

  meanings?: MeaningNode[];
  metadata?: MetadataNode[];
  embedding?: number[][];
};

export type Position = {
  start: number;
  end: number;
};

// export type MeaningNode = {
//   partOfSpeech: string;
//   // Relationships
//   definitions: DefinitionNode[];
//   synonyms: SynonymNode[];
//   antonyms: AntonymNode[];
// };

export type MeaningNode = {
  partsOfSpeech: string[];
  definitions: string[];
  examples?: string[];
  // Optional relationships for extended connectivity
  synonyms?: SynonymNode[];
  antonyms?: AntonymNode[];
};

export type SynonymNode = {
  word: string;
  // Could link to other WordNodes if you want to establish direct connections between synonyms
};

export type AntonymNode = {
  word: string;
};

export type MetadataNode = {
  type: string;
  associated_concepts: string[];
  images: string[];
  sounds: string[];
  feelings: string[];
  related_colors: string[];
  related_natural_elements: string[];
  // Depending on the use case, you might also link to other nodes here
};

export type BoundaryWordNode = WordNode & {
  nextPacketNr: number;
};

// export type Position = {
//   start: number;
//   end: number;
// };

// export type Metadata = {
//   type: string;
//   associatedConcepts: string[];
//   images: string[];
//   sounds: string[];
//   feelings: string[];
//   relatedColors: string[];
//   relatedNaturalElements: string[];
// };

// export type WordData = {
//   word: string;
//   packetNr: number;
//   position: Position;
//   wordNr: number;
//   chars: number;
//   meaning?: Meaning[]; // Assuming a word can have multiple meanings
//   metadata?: Metadata[];
//   trash?: boolean;
// };

// export type BoundaryWordData = WordData & {
//   nextPacketNr: number;
// };

// export type WordDataPacket = {
//   wordData: WordData[];
//   nextPacketNr: number;
// };
