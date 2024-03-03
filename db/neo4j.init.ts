
import neo4j,{ driver  } from 'neo4j-driver';



// Access environment variables
const uri = process.env.NEO4J_URI as string;
const user = process.env.NEO4J_USER as string;
const password = process.env.NEO4J_PASSWORD as string;

// Create a driver instance
const neo4jDriver = driver(uri, neo4j.auth.basic(user, password));

// Use the driver for database operations
