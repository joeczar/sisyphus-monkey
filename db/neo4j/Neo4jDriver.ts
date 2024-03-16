import type { Driver } from 'neo4j-driver';
import neo4j from 'neo4j-driver';

export class Neo4jDriverSingleton {
  private static driverInstance: Driver | null = null;

  public static getDriver(): Driver {
    if (!this.driverInstance) {
      // Synchronous initialization, or handle async initialization internally
      const URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
      const USER = process.env.NEO4J_USERNAME || 'neo4j';
      const PASSWORD = process.env.NEO4J_PASSWORD || 'password';
      console.log('Creating new driver instance with URI:', URI);
      this.driverInstance = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD));
      // Assume verifyConnectivity() or similar async calls are handled appropriately
    }
    return this.driverInstance;
  }
}
