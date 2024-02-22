import { initDb } from '../db/dbService';
import { pullPacketsForParsing } from './pullPacketsForParsing';

initDb();

async function startProcessing() {
  // Your polling and processing logic here
  const packets = await pullPacketsForParsing();
  console.log(packets);
}

startProcessing().catch((err) =>
  console.error('Error in message processing:', err)
);
