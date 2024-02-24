export type WordData = {
  word: string;
  packetNr: number;
  position: { start: number; end: number };
};

export type BoundaryWordData = WordData & {
  nextPacketNr: number;
};
