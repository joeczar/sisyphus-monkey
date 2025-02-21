import { sqliteService } from '../db/SQLiteService';

async function addTestChunks() {
  try {
    // Initialize SQLite
    await sqliteService.initialize();
    
    // Add some test chunks with known words
    const testChunks = [
      'theprogrammerwritescode',
      'dancingcatplaysinthemoonlight',
      'beautifulbutterfliesflutter'
    ];

    console.log('Adding test chunks...');
    for (let i = 0; i < testChunks.length; i++) {
      const chunkId = await sqliteService.addChunk(testChunks[i], i + 1);
      console.log(`Added chunk ${i + 1}: ${testChunks[i]} (ID: ${chunkId})`);
    }

    console.log('\nTest chunks added successfully!');
  } catch (error) {
    console.error('Failed to add test chunks:', error);
  }
}

// Run the script
addTestChunks(); 