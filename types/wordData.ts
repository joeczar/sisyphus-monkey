export type WordData = {
  word: string;
  packetNr: number;
  position: { start: number; end: number };
  buffer: string;
};

export type BoundaryWordData = WordData & {
  nextPacketNr: number;
};
