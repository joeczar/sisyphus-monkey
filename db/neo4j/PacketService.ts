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
