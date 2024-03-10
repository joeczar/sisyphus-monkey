import neo4j from 'neo4j-driver';
import type { Driver } from 'neo4j-driver';

export type Packet = {
  id: number;
  content: string;
  source: string;
  timestamp: Date;
};

export type Word = {
  text: string;
  length: number;
  originalOrder: number;
};

class Neo4jDatabase {
  private driver: Driver;
  private queue: (() => Promise<void>)[] = [];

  constructor() {
    this.driver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'sysyphus'
      )
    );
    this.processQueue();
  }
  public async checkConnection(): Promise<boolean> {
    const session = this.driver.session();
    if (!session) {
      console.error('Error creating Neo4j session');
      return false;
    }
    try {
      // Running a simple query to fetch the Neo4j version
      await session.run('RETURN "Connection successful" as message');
      return true;
    } catch (error) {
      console.error('Error checking Neo4j connection:', error);
      return false;
    } finally {
      await session.close();
    }
  }

  private async processQueue() {
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        try {
          await task();
          console.log('Queue task complete. Remaining ', this.queue.length);
        } catch (error) {
          console.error('Error processing task:', error);
        }
      }

      // Throttle the processing to avoid overloading the Raspberry Pi
      // await new Promise((resolve) => setTimeout(resolve, 10)); // 100ms delay between tasks
    }

    // When queue is empty, wait a bit before checking again
    await new Promise((resolve) => setTimeout(resolve, 500));
    this.processQueue();
  }

  public enqueue(task: () => Promise<void>) {
    this.queue.push(task);
  }

  public async createPacket(packet: Packet): Promise<void> {
    this.enqueue(async () => {
      const session = this.driver.session();
      try {
        await session.run(
          'CREATE (packet:Packet {id: $id, content: $content, source: $source, timestamp: $timestamp})',
          {
            id: packet.id,
            content: packet.content,
            source: packet.source,
            timestamp: neo4j.types.DateTime.fromStandardDate(packet.timestamp),
          }
        );
      } finally {
        await session.close();
      }
    });
  }
  public async batchPackets(packetBatch: Packet[]): Promise<void> {
    try {
      for (const packet of packetBatch) {
        await this.createPacket(packet);
      }
    } catch (error) {
      console.error('Error in batchPackets', error);
    }
  }
  public async countPackets(): Promise<number> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        'MATCH (packet:Packet) RETURN COUNT(packet) as count'
      );
      const count = result.records[0].get('count').toNumber();
      return count;
    } catch (error) {
      console.error('Error counting packets:', error);
      throw error; // Allows further handling of the error if needed
    } finally {
      await session.close();
    }
  }
  public async getPackets(limit: number = 10): Promise<Packet[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (packet:Packet) 
        RETURN packet.id AS id, packet.content AS content,
               packet.source AS source, packet.timestamp AS timestamp
        ORDER BY packet.timestamp DESC
        LIMIT toInteger($limit)`, // Use Cypher's toInteger function
        { limit } // Pass the original number (JavaScript will ensure it is an integer)
      );

      const packets = result.records.map((record) => ({
        id: record.get('id'),
        content: record.get('content'),
        source: record.get('source'),
        timestamp: new Date(record.get('timestamp')),
      }));

      return packets;
    } catch (error) {
      throw error;
    } finally {
      await session.close();
    }
  }

  public async createWord(word: Word): Promise<void> {
    this.enqueue(async () => {
      const session = this.driver.session();
      try {
        await session.run(
          'MERGE (word:Word {text: $text}) ON CREATE SET word.frequency = 1, word.length = $length ON MATCH SET word.frequency = word.frequency + 1',
          {
            text: word.text,
            length: word.length,
          }
        );
      } finally {
        await session.close();
      }
    });
  }

  public async createRelationship(packetId: string, word: Word): Promise<void> {
    this.enqueue(async () => {
      const session = this.driver.session();
      try {
        await session.run(
          'MATCH (packet:Packet {id: $packetId}), (word:Word {text: $text}) MERGE (packet)-[:CONTAINS {position: $position}]->(word)',
          {
            packetId: packetId,
            text: word.text,
            position: word.originalOrder,
          }
        );
      } finally {
        await session.close();
      }
    });
  }
  public async clearDatabase(): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run('MATCH (n) DETACH DELETE n');
      console.log('Database cleared successfully.');
    } catch (error) {
      console.error('Error clearing the database:', error);
      throw error; // Rethrowing the error allows the caller to handle it
    } finally {
      await session.close();
    }
  }

  public async close() {
    await this.driver.close();
  }
}
const neo4jDb = new Neo4jDatabase();
export default neo4jDb;
