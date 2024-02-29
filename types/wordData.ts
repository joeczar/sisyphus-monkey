export type WordData = {
  word: string;
  packetNr: number;
  position: { start: number; end: number };
  wordNr: number;
};

export type BoundaryWordData = WordData & {
  nextPacketNr: number;
};

export type WordDataPacket = {
  wordData: WordData[];
  nextPacketNr: number;
};
