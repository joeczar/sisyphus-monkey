import { Database } from 'bun:sqlite';
import { randomUUID } from 'node:crypto';

export interface CharChunk {
  id: string;
  content: string;
  position: number;
  timestamp: Date;
  processed: boolean;
}

export interface Word {
  id: string;
  value: string;
  chunkId: string;
  position: number;
  foundAt: Date;
}

export interface WordPacket {
  id: string;
  sequence: number;
  wordCount: number;
  timestamp: Date;
  processed: boolean;
  word_count: number;
}

export interface PacketWord {
  packetId: string;
  wordId: string;
  sequence: number;
}

export interface Poem {
  id: string;
  content: string;
  timestamp: Date;
  style: string;
  iteration: number;
  packetId: string;
}

export class SQLiteService {
  private db: Database;
  private initialized: boolean = false;

  constructor(dbPath: string = 'words.db') {
    this.db = new Database(dbPath);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Enable foreign keys
    this.db.run('PRAGMA foreign_keys = ON;');

    // Create tables
    this.db.run(`
      CREATE TABLE IF NOT EXISTS chunks (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        position INTEGER NOT NULL,
        timestamp DATETIME NOT NULL,
        processed BOOLEAN NOT NULL DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS words (
        id TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        chunk_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        found_at DATETIME NOT NULL,
        FOREIGN KEY(chunk_id) REFERENCES chunks(id)
      );

      CREATE TABLE IF NOT EXISTS word_packets (
        id TEXT PRIMARY KEY,
        sequence INTEGER NOT NULL,
        word_count INTEGER NOT NULL,
        timestamp DATETIME NOT NULL,
        processed BOOLEAN NOT NULL DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS packet_words (
        packet_id TEXT NOT NULL,
        word_id TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        PRIMARY KEY(packet_id, word_id),
        FOREIGN KEY(packet_id) REFERENCES word_packets(id),
        FOREIGN KEY(word_id) REFERENCES words(id)
      );

      CREATE TABLE IF NOT EXISTS poems (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        timestamp DATETIME NOT NULL,
        style TEXT NOT NULL,
        iteration INTEGER NOT NULL,
        packet_id TEXT NOT NULL,
        FOREIGN KEY(packet_id) REFERENCES word_packets(id)
      );

      -- Indexes for common queries
      CREATE INDEX IF NOT EXISTS idx_chunks_processed ON chunks(processed);
      CREATE INDEX IF NOT EXISTS idx_words_value ON words(value);
      CREATE INDEX IF NOT EXISTS idx_packets_processed ON word_packets(processed);
      CREATE INDEX IF NOT EXISTS idx_poems_iteration ON poems(iteration);
    `);

    this.initialized = true;
  }

  // Chunk operations
  async addChunk(content: string, position: number): Promise<string> {
    const id = randomUUID();
    this.db.prepare(
      'INSERT INTO chunks (id, content, position, timestamp, processed) VALUES (?, ?, ?, datetime(), FALSE)'
    ).run(id, content, position);
    return id;
  }

  async markChunkProcessed(id: string): Promise<void> {
    this.db.prepare(
      'UPDATE chunks SET processed = TRUE WHERE id = ?'
    ).run(id);
  }

  async getUnprocessedChunks(): Promise<CharChunk[]> {
    return this.db.prepare(
      'SELECT * FROM chunks WHERE processed = FALSE ORDER BY position'
    ).all() as CharChunk[];
  }

  // Word operations
  async addWord(value: string, chunkId: string, position: number): Promise<string> {
    const id = randomUUID();
    this.db.prepare(
      'INSERT INTO words (id, value, chunk_id, position, found_at) VALUES (?, ?, ?, ?, datetime())'
    ).run(id, value.toLowerCase(), chunkId, position);
    return id;
  }

  async getUnusedWords(): Promise<Word[]> {
    return this.db.prepare(`
      SELECT * FROM words w
      WHERE NOT EXISTS (
        SELECT 1 FROM packet_words pw
        WHERE pw.word_id = w.id
      )
      ORDER BY found_at
    `).all() as Word[];
  }

  // Word packet operations
  async createWordPacket(words: string[], sequence: number): Promise<string> {
    const id = randomUUID();
    this.db.prepare(
      'INSERT INTO word_packets (id, sequence, word_count, timestamp, processed) VALUES (?, ?, ?, datetime(), FALSE)'
    ).run(id, sequence, words.length);

    // Add words to packet
    const stmt = this.db.prepare(
      'INSERT INTO packet_words (packet_id, word_id, sequence) VALUES (?, ?, ?)'
    );
    words.forEach((wordId, idx) => {
      stmt.run(id, wordId, idx);
    });

    return id;
  }

  async getUnprocessedPackets(): Promise<WordPacket[]> {
    return this.db.prepare(`
      SELECT wp.*, COUNT(pw.word_id) as word_count 
      FROM word_packets wp
      LEFT JOIN packet_words pw ON wp.id = pw.packet_id
      WHERE wp.processed = FALSE 
      GROUP BY wp.id
      ORDER BY wp.sequence
    `).all() as WordPacket[];
  }

  // Poem operations
  async addPoem(content: string, style: string, packetId: string, iteration: number): Promise<string> {
    const id = randomUUID();
    this.db.prepare(
      'INSERT INTO poems (id, content, timestamp, style, iteration, packet_id) VALUES (?, ?, datetime(), ?, ?, ?)'
    ).run(id, content, style, iteration, packetId);
    return id;
  }

  async getPoemsByIteration(iteration: number): Promise<Poem[]> {
    return this.db.prepare(
      'SELECT * FROM poems WHERE iteration = ? ORDER BY timestamp'
    ).all(iteration) as Poem[];
  }

  // Tracing queries
  async getWordOrigins(poemId: string): Promise<Array<{ word: string, chunk: string, position: number }>> {
    return this.db.prepare(`
      SELECT w.value as word, c.content as chunk, w.position
      FROM poems p
      JOIN packet_words pw ON p.packet_id = pw.packet_id
      JOIN words w ON pw.word_id = w.id
      JOIN chunks c ON w.chunk_id = c.id
      WHERE p.id = ?
      ORDER BY w.position
    `).all(poemId) as Array<{ word: string, chunk: string, position: number }>;
  }

  // Reset operations
  async reset(): Promise<void> {
    // Drop all tables
    this.db.run(`
      DROP TABLE IF EXISTS poems;
      DROP TABLE IF EXISTS packet_words;
      DROP TABLE IF EXISTS word_packets;
      DROP TABLE IF EXISTS words;
      DROP TABLE IF EXISTS chunks;
    `);
    
    this.initialized = false;
    await this.initialize();
  }

  async close(): Promise<void> {
    this.db.close();
  }

  async getPacketWords(packetId: string): Promise<string[]> {
    const result = this.db.prepare(`
      SELECT w.value
      FROM packet_words pw
      JOIN words w ON pw.word_id = w.id
      WHERE pw.packet_id = ?
      ORDER BY pw.sequence
    `).all(packetId) as Array<{ value: string }>;

    return result.map(row => row.value);
  }

  async getPacketWordsWithPositions(packetId: string): Promise<Array<{ value: string, position: number }>> {
    return this.db.prepare(`
      SELECT w.value, w.position
      FROM packet_words pw
      JOIN words w ON pw.word_id = w.id
      WHERE pw.packet_id = ?
      ORDER BY w.position
    `).all(packetId) as Array<{ value: string, position: number }>;
  }
}

// Export singleton instance
export const sqliteService = new SQLiteService(); 