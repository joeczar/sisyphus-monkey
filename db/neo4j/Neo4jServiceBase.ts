import type { Driver } from 'neo4j-driver';
import { Neo4jDriverSingleton } from './Neo4jDriver';

export abstract class Neo4jServiceBase {
  protected driver: Driver;

  protected constructor() {
    this.driver = Neo4jDriverSingleton.getDriver();
  }

  public async checkConnection(): Promise<boolean> {
    try {
      const serverInfo = await this.driver.getServerInfo();
      console.log('Connection established');
      console.log(serverInfo);
      console.log('Checking Neo4j connection...');
      if (serverInfo) {
        console.log('Connection established.');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking Neo4j connection:', error);
      return false;
    }
  }
}
