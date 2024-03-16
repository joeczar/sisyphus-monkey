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
        `CREATE (p:Packet {id: $id, content: $content, source: $source, charCount: $charCount }) RETURN p`,
        {
          id: packet.id,
          content: packet.content,
          source: packet.source,
          charCount: packet.charCount,
        }
      );
      return result;
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

  public async getPacket(id: string) {
    const session = this.driver.session();
    try {
      const result = await session.run(`MATCH (p:Packet {id: $id}) RETURN p`, {
        id,
      });
      return result.records[0].get('p');
    } finally {
      session.close();
    }
  }
}

const packetService = new PacketService();
export { packetService };
