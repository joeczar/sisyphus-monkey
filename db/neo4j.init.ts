// import neo4j from 'neo4j-driver';

// const uri = 'bolt://localhost:7687';
// const user = 'neo4j';
// const password = 'moonneo4j';
// const auth = neo4j.auth.basic(user, password);

// const driver = neo4j.driver(uri, auth, {
//   encrypted: false,
// });

// async function testConnection() {
//   console.log('Testing connection to Neo4j', auth);
//   try {
//     await driver.verifyConnectivity();
//     console.log('Connection established successfully');
//   } catch (error) {
//     console.error('Failed to connect:', error);
//   } finally {
//     await driver.close();
//   }
// }

// testConnection();
