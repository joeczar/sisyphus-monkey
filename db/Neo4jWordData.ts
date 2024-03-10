import { Driver, Session } from 'neo4j-driver';
import type { WordData } from '../types/wordData';
import neo4j from 'neo4j-driver';

let driverInstance: Driver | null = null;

async function initializeDriver() {
  const URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
  const USER = process.env.NEO4J_USERNAME || 'neo4j';
  const PASSWORD = process.env.NEO4J_PASSWORD || 'moonneo4j';

  try {
    const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD));
    await driver.verifyConnectivity();
    console.log('Connection to Neo4j established');
    return driver;
  } catch (error) {
    console.error('Failed to connect to Neo4j:', error);
    throw error; // Or handle it as per your application's error handling policy
  }
}

async function getDriver() {
  if (!driverInstance) {
    driverInstance = await initializeDriver();
  }
  return driverInstance;
}

export class WordDataService {
  private driver: Driver;

  constructor(driver: Driver) {
    this.driver = driver;
  }

  public async checkConnection(): Promise<boolean> {
    console.log('Checking Neo4j connection...');
    const session = this.driver.session();
    console.log('Session created');
    try {
      // Running a simple query to fetch the Neo4j version
      const result = await session.run(
        'RETURN "Connection successful" as message'
      );
      console.log('Connection successful', result.records[0].get('message'));
      return true;
    } catch (error) {
      console.error('Error checking Neo4j connection:', error);
      return false;
    } finally {
      await session.close();
    }
  }

  public async createWordNodes(wordDataList: WordData[]) {
    const session = this.driver.session();

    try {
      await session.writeTransaction((tx) => {
        const query = `
          UNWIND $wordDataList AS wordData
          CREATE (w:Word {
            word: wordData.word,
            packetNr: wordData.packetNr,
            startPosition: wordData.position.start,
            endPosition: wordData.position.end,
            wordNr: wordData.wordNr,
            chars: wordData.chars
          })
        `;
        return tx.run(query, { wordDataList });
      });
    } catch (error) {
      console.error('Error creating word nodes:', error);
      throw error;
    } finally {
      console.log('Word nodes created');
      await session.close();
      return true;
    }
  }

  public async createMeaningRelationships(wordDataList: WordData[]) {
    const session = this.driver.session();

    try {
      await session.writeTransaction((tx) => {
        const query = `
          UNWIND $wordDataList AS wordData
          MATCH (w:Word {word: wordData.word, packetNr: wordData.packetNr})
          UNWIND wordData.meaning AS meaning
          CREATE (w)-[:HAS_MEANING]->(m:Meaning {
            partOfSpeech: meaning.partOfSpeech,
            definitions: meaning.definitions,
            synonyms: meaning.synonyms,
            antonyms: meaning.antonyms
          })
        `;
        return tx.run(query, { wordDataList });
      });
    } catch (error) {
      console.error('Error creating meaning relationships:', error);
      throw error;
    } finally {
      await session.close();
      return true;
    }
  }

  public async createMetadataRelationships(wordDataList: WordData[]) {
    const session = this.driver.session();

    try {
      await session.writeTransaction((tx) => {
        const query = `
          UNWIND $wordDataList AS wordData
          MATCH (w:Word {word: wordData.word, packetNr: wordData.packetNr})
          UNWIND wordData.metadata AS metadata
          CREATE (w)-[:HAS_METADATA]->(md:Metadata {
            type: metadata.type,
            associatedConcepts: metadata.associated_concepts,
            images: metadata.images,
            sounds: metadata.sounds,
            feelings: metadata.feelings,
            relatedColors: metadata.related_colors,
            relatedNaturalElements: metadata.related_natural_elements
          })
        `;
        return tx.run(query, { wordDataList });
      });
    } catch (error) {
      console.error('Error creating metadata relationships:', error);
      throw error;
    } finally {
      await session.close();
      return true;
    }
  }
  public async insertWordData(wordDataList: WordData[]) {
    const session = this.driver.session();

    try {
      await session.writeTransaction((tx) => {
        const query = `
        UNWIND $wordDataList AS wordData
        CREATE (w:Word {
          word: wordData.word,
          packetNr: wordData.packetNr,
          startPosition: wordData.position.start,
          endPosition: wordData.position.end,
          wordNr: wordData.wordNr,
          chars: wordData.chars
        })
        WITH w, wordData
        UNWIND wordData.meaning AS meaning
        CREATE (w)-[:HAS_MEANING]->(m:Meaning {
          partOfSpeech: meaning.partOfSpeech,
          synonyms: meaning.synonyms,
          antonyms: meaning.antonyms
        })
        WITH w, meaning
        UNWIND meaning.definitions AS definition
        CREATE (m)-[:HAS_DEFINITION]->(d:Definition {
          definition: definition.definition,
          synonyms: definition.synonyms,
          antonyms: definition.antonyms,
          example: definition.example
        })

        `;
        return tx.run(query, { wordDataList });
      });
    } catch (error) {
      console.error('Error inserting word data:', error);
      throw error;
    } finally {
      await session.close();
      return true;
    }
  }

  public async createIndexes() {
    const session = this.driver.session({});

    try {
      const result = await session.writeTransaction((tx) => {
        const query = `
        CREATE INDEX FOR (w:Word) ON (w.packetNr, w.wordNr)
        `;
        return tx.run(query);
      });
    } catch (error) {
      if (
        (error as { code: string }).code ===
        'Neo.ClientError.Schema.EquivalentSchemaRuleAlreadyExists'
      ) {
        console.log('Indexes already created');
        return await session.close();
      }
      console.error('Error creating indexes:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  public async createWordOrderConnections() {
    const session = this.driver.session({});
    const query = `MATCH (w1:Word), (w2:Word)
    WHERE w1.packetNr = w2.packetNr AND w1.wordNr = w2.wordNr - 1
    MERGE (w1)-[:NEXT_WORD]->(w2)
    `;
    try {
      await session.writeTransaction((tx) => {
        return tx.run(query);
      });
    } catch (error) {
      console.error('Error creating word order connections:', error);
      throw error;
    }
  }

  public async getWordDataObjects(): Promise<WordData[]> {
    const session = this.driver.session({});

    try {
      const result = await session.readTransaction((tx) => {
        const query = `
          MATCH (w:Word)-[:HAS_MEANING]->(m:Meaning)
          MATCH (w)-[:HAS_METADATA]->(md:Metadata)
          RETURN w, collect(m) AS meanings, collect(md) AS metadata
        `;
        return tx.run(query);
      });

      const wordDataObjects: WordData[] = result.records.map((record) => {
        const wordNode = record.get('w').properties;
        const meanings = record
          .get('meanings')
          .map((meaningNode: any) => meaningNode.properties);
        const metadata = record
          .get('metadata')
          .map((metadataNode: any) => metadataNode.properties);

        return {
          word: wordNode.word,
          packetNr: wordNode.packetNr,
          position: {
            start: wordNode.startPosition,
            end: wordNode.endPosition,
          },
          wordNr: wordNode.wordNr,
          chars: wordNode.chars,
          meaning: meanings,
          metadata: metadata,
        };
      });

      return wordDataObjects;
    } finally {
      await session.close();
    }
  }
}

const driver = await getDriver();
export const neo4jDb = new WordDataService(driver);
