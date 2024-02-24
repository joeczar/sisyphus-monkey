import type { WordData } from "./wordData";

export type WordsPacket = {
  packetNr: number;
  charCount: number;
  words: WordData[];
}