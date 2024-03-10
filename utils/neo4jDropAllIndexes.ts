import neo4j from 'neo4j-driver';

async function dropAllIndexes() {
  const uri = 'bolt://localhost:7687';
  const user = 'neo4j';
  const password = 'moonneo4j';
  const auth = neo4j.auth.basic(user, password);

  const driver = neo4j.driver(uri, auth, {
    encrypted: false,
  });

  const session = driver.session();

  try {
    // Fetch all indexes
    const result = await session.run('SHOW INDEXES');
    const indexes = result.records.map((record) => record.get('name'));

    // Drop each index
    for (const indexName of indexes) {
      await session.run(`DROP INDEX ${indexName}`);
      console.log(`Dropped index: ${indexName}`);
    }
  } catch (error) {
    console.error('Error dropping indexes:', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

dropAllIndexes();
