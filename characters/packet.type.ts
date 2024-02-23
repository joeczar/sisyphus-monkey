export type Packet = {
  id?: number;
  chunk: string;
  charCount: number;
  packetNr: number;
  timestamp?: string;
};
