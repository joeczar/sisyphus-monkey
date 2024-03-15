import neo4j, { Driver, Session } from 'neo4j-driver';

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
}
