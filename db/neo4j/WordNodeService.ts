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
    this.#instance.checkConnection();
    return this.#instance;
  }

  async createWordNodes(words: WordNode[]) {
    console.log('Creating word nodes:', words.length, words[0]);
    const session = this.driver.session();
    try {
      const result = await session.run(
        `UNWIND $words AS wordNode
        MERGE (p:Packet {id: wordNode.packetNr})
        WITH wordNode, p
        CREATE (w:Word {
          word: wordNode.word,
          packetNr: wordNode.packetNr,
          startPosition: wordNode.position.start,
          endPosition: wordNode.position.end,
          wordNr: wordNode.wordNr,
          chars: wordNode.chars
        })
        MERGE (w)-[:BELONGS_TO]->(p)
        WITH w, wordNode
        ORDER BY wordNode.wordNr ASC
        WITH collect(w) AS words
        FOREACH (i in RANGE(0, size(words)-2) |
          FOREACH (curr in [words[i]] |
            FOREACH (next in [words[i+1]] |
              MERGE (curr)-[:NEXT]->(next)
            )
          )
        )
        RETURN count(words) as totalWordsCreated        
        `,
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
