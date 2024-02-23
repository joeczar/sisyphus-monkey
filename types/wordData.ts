export type WordData = {
  word: string;
  packetNr: number;
  position: { i: number; j: number };
  buffer: string;
};

export type BoundaryWordData = WordData & {
  nextPacketNr: number;
};
