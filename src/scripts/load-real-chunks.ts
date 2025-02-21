import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { sqliteService } from '../db/SQLiteService';

interface ChunkFile {
  id: number;
  content: string;
  charCount: number;
  source: string;
  timestamp: string;
}

async function loadRealChunks() {
  try {
    // Initialize SQLite
    await sqliteService.initialize();
    
    // Reset database to start fresh
    await sqliteService.reset();
    await sqliteService.initialize();
    
    // Get list of chunk files
    const chunksDir = join(process.cwd(), 'generated-letters-chunked');
    const files = await readdir(chunksDir);
    
    // Sort files by chunk number
    const sortedFiles = files
      .filter(f => f.endsWith('.json'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/chunk-(\d+)/)?.[1] || '0');
        const numB = parseInt(b.match(/chunk-(\d+)/)?.[1] || '0');
        return numA - numB;
      });
    
    console.log(`Found ${sortedFiles.length} chunk files`);
    
    // Load first 3 chunks for testing, but take only first 100 characters from each
    const chunksToLoad = sortedFiles.slice(0, 3);
    
    // Load each chunk
    for (const filename of chunksToLoad) {
      const filePath = join(chunksDir, filename);
      const chunkData: ChunkFile = await Bun.file(filePath).json();
      
      // Take only first 100 characters
      const truncatedContent = chunkData.content.slice(0, 100);
      
      // Add to database
      const chunkId = await sqliteService.addChunk(
        truncatedContent,
        chunkData.id
      );
      
      console.log(`Loaded chunk ${chunkData.id} (${filename})`);
      console.log(`Content preview: ${truncatedContent.slice(0, 50)}...`);
      console.log(`ID: ${chunkId}\n`);
    }
    
    console.log('\nChunks loaded successfully!');
    
  } catch (error) {
    console.error('Failed to load chunks:', error);
  }
}

// Run the script
loadRealChunks(); 