import { sqliteService } from '../db/SQLiteService';
import type { Word } from '../db/SQLiteService';

export interface PacketOptions {
  minSize?: number;      // Minimum words per packet
  maxSize?: number;      // Maximum words per packet
  preferRelated?: boolean; // Try to group related words
}

const DEFAULT_OPTIONS: Required<PacketOptions> = {
  minSize: 5,
  maxSize: 10,
  preferRelated: true
};

export class WordPacketService {
  private initialized = false;
  private currentSequence = 0;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await sqliteService.initialize();
    this.initialized = true;
  }

  /**
   * Creates word packets from unused words
   * @param options Configuration for packet creation
   * @returns Array of packet IDs created
   */
  async createPackets(options: PacketOptions = {}): Promise<string[]> {
    if (!this.initialized) {
      throw new Error('WordPacketService not initialized');
    }

    const opts = { ...DEFAULT_OPTIONS, ...options };
    const unusedWords = await sqliteService.getUnusedWords();
    const packetIds: string[] = [];

    // No words to process
    if (unusedWords.length === 0) {
      return packetIds;
    }

    // Group words into packets
    const packets = this.groupWordsIntoPackets(unusedWords, opts);

    // Store each packet
    for (const packet of packets) {
      const packetId = await sqliteService.createWordPacket(
        packet.map(w => w.id),
        this.currentSequence++
      );
      packetIds.push(packetId);
    }

    return packetIds;
  }

  /**
   * Groups words into packets, attempting to maintain coherence
   */
  private groupWordsIntoPackets(words: Word[], options: Required<PacketOptions>): Word[][] {
    const packets: Word[][] = [];
    let currentPacket: Word[] = [];

    // Simple grouping for now - we'll enhance this later with word relationships
    for (const word of words) {
      currentPacket.push(word);

      // When packet reaches max size or we have enough words and hit a good break point
      if (currentPacket.length >= options.maxSize ||
          (currentPacket.length >= options.minSize && this.isGoodBreakPoint(currentPacket))) {
        packets.push(currentPacket);
        currentPacket = [];
      }
    }

    // Add any remaining words if we have enough
    if (currentPacket.length >= options.minSize) {
      packets.push(currentPacket);
    }

    return packets;
  }

  /**
   * Determines if this is a good point to break a packet
   * This is a placeholder for more sophisticated logic later
   */
  private isGoodBreakPoint(packet: Word[]): boolean {
    // For now, just break on punctuation-like words or every 7 words
    const lastWord = packet[packet.length - 1];
    return packet.length % 7 === 0 || /[.!?;,]$/.test(lastWord.value);
  }

  async getUnprocessedPackets() {
    return sqliteService.getUnprocessedPackets();
  }

  async reset(): Promise<void> {
    this.currentSequence = 0;
    this.initialized = false;
  }
}

// Export singleton instance
export const wordPacketService = new WordPacketService(); 