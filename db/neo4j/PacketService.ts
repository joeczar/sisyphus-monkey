import type { Packet } from '../../characters/packet.type';
import { Neo4jServiceBase } from './Neo4jServiceBase';

export class PacketService extends Neo4jServiceBase {
  constructor() {
    super();
  }

  public async savePacket(packet: Packet) {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MERGE (s:Source {id: $packet.source})
        CREATE (p:Packet {packetNr: $packet.id, content: $packet.content, charCount: $packet.charCount, timestamp: $packet.timestamp})
        CREATE (p)-[:ORIGINATES_FROM]->(s)
        RETURN p.packetNr AS id`,
        { packet } // Pass the entire packet object as a parameter
      );
      return result.records[0].get('id');
    } finally {
      session.close();
    }
  }

  public async savePacketBatch(packets: Packet[]) {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `UNWIND $packets AS packet
        MERGE (s:Source {id: packet.source})
        CREATE (p:Packet {packetNr: packet.id, content: packet.content, charCount: packet.charCount, timestamp: packet.timestamp})
        CREATE (p)-[:ORIGINATES_FROM]->(s)
        WITH p, packet
        ORDER BY p.packetNr
        WITH collect(p) AS packets
        FOREACH (i IN RANGE(0, size(packets)-2) |
          FOREACH (p1 IN [packets[i]] |
            FOREACH (p2 IN [packets[i+1]] |
              CREATE (p1)-[:NEXT]->(p2)
            )
          )
        )
        RETURN packets`,
        {
          packets, // Ensure your 'packets' array has the correct structure expected by the query
        }
      );
      return result;
    } finally {
      session.close();
    }
  }

  public async getPacket(id: number) {
    const session = this.driver.session();
    try {
      const result = await session.run(`MATCH (p:Packet {id: $id}) RETURN p`, {
        id,
      });
      if (result.records.length > 0) {
        const packet = result.records[0].get('p');
        return {
          id: packet.properties.packetNr,
          content: packet.properties.content,
          source: packet.properties.source,
          charCount: packet.properties.charCount,
        } as Packet;
      }
      return undefined;
    } finally {
      session.close();
    }
  }

  async getPackets(amount: number, offset: number = 0): Promise<Packet[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (p:Packet) RETURN p SKIP toInteger($offset) LIMIT toInteger($amount)`,
        {
          amount,
          offset,
        }
      );
      if (result.records.length > 0) {
        console.log('Packets:', result.records[0]);
        const packets = result.records
          .map((record) => record.get('p'))
          .map((p) => {
            return {
              id: p.properties.packetNr,
              content: p.properties.content,
              source: p.properties.source,
              charCount: p.properties.charCount,
            } as Packet;
          });
        return packets;
      }
      return [];
    } finally {
      session.close();
    }
  }

  async getPacketCount(): Promise<number> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        'MATCH (p:Packet) RETURN count(p) AS count'
      );
      if (result.records.length > 0) {
        // For numbers within JavaScript’s safe integer range, .low is sufficient
        const countResult = result.records[0].get('count');

        return Math.floor(countResult.toInt());
      } else {
        // No result scenario
        return 0;
      }
    } catch (error) {
      console.error('Error in getPacketCount:', error);
      throw error; // Rethrow or handle as per your error handling strategy
    } finally {
      await session.close();
    }
  }

  async clearDb() {
    const session = this.driver.session();
    try {
      await session.run('MATCH (n) DETACH DELETE n');
    } finally {
      await session.close();
    }
  }
}

const packetService = new PacketService();
export { packetService };
