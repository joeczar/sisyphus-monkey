import type { Driver } from 'neo4j-driver';
import { Neo4jDriverSingleton } from './Neo4jDriver';

export abstract class Neo4jServiceBase {
  protected driver: Driver;

  protected constructor() {
    this.driver = Neo4jDriverSingleton.getDriver();
  }

  public async checkConnection(): Promise<boolean> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        'RETURN "Message from Neo4j" as message'
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
}
