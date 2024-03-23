import type { WordNode } from '../../types/wordNode';
import { Neo4jServiceBase } from './Neo4jServiceBase';

class WordNodeService extends Neo4jServiceBase {
  static #instance: WordNodeService;

  private constructor() {
    super();
  }

  public static getInstance(): WordNodeService {
    if (!this.#instance) {
      this.#instance = new WordNodeService();
    }
    return this.#instance;
  }

  async createWordNodes(words: WordNode[]) {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `UNWIND $words AS word
        MERGE (w:WordNode {wordNr: word.wordNr})
        ON CREATE SET w.word = word.word, w.chars = word.chars, 
                      w.positionStart = word.position.start, w.positionEnd = word.position.end
        WITH w, word
        MATCH (p:Packet {id: word.packetNr})
        MERGE (p)-[:CONTAINS]->(w)
        RETURN w`,
        { words }
      );
      console.log(`${result.records.length} Word nodes created and linked.`);
    } catch (error) {
      console.error('Error creating word nodes:', error);
    } finally {
      await session.close();
    }
  }
}

export const wordNodeService = WordNodeService.getInstance();
