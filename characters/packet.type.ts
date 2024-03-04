export type PacketOld = {
  id?: number;
  chunk: string;
  charCount: number;
  packetNr: number;
  timestamp?: string;
};
export type Packet = {
  id: number;
  content: string;
  source: string;
  charCount: number;
  timestamp: Date;
};

export type Word = {
  text: string;
  length: number;
  originalOrder: number;
};
