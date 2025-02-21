import { wordFinderService } from '../word-finder/WordFinderService';
import { wordPacketService } from '../word-finder/WordPacketService';
import { poetryService } from '../poetry/PoetryService';
import { sqliteService } from '../db/SQLiteService';

export interface ProcessingResult {
  chunkId: string;
  wordsFound: number;
  packetsCreated: number;
  poemsGenerated: number;
  errors?: Error[];
  warnings?: string[];
}

export interface ProcessingState {
  currentChunk: number;
  totalChunks: number;
  processedWords: number;
  activePackets: number;
  completedPoems: number;
  lastError?: Error;
  status: 'ready' | 'processing' | 'paused' | 'error' | 'complete';
}

export class StepController {
  private state: ProcessingState;
  private delayBetweenSteps: number = 0;
  private loggingLevel: 'debug' | 'info' | 'error' = 'info';
  private isPaused: boolean = false;

  constructor() {
    this.state = {
      currentChunk: 0,
      totalChunks: 0,
      processedWords: 0,
      activePackets: 0,
      completedPoems: 0,
      status: 'ready'
    };
  }

  async initialize(): Promise<void> {
    try {
      this.log('debug', 'Initializing services...');
      
      // Initialize all required services
      await Promise.all([
        wordFinderService.initialize(),
        wordPacketService.initialize(),
        poetryService.initialize()
      ]);

      // Get initial state
      const unprocessedChunks = await wordFinderService.getUnprocessedChunks();
      this.state.totalChunks = unprocessedChunks.length;
      
      this.log('info', `Initialized with ${this.state.totalChunks} chunks to process`);
      this.state.status = 'ready';
    } catch (error) {
      this.state.status = 'error';
      this.state.lastError = error as Error;
      throw error;
    }
  }

  async processNextChunk(): Promise<ProcessingResult> {
    if (this.isPaused) {
      throw new Error('Processing is paused');
    }

    try {
      this.state.status = 'processing';
      const result: ProcessingResult = {
        chunkId: '',
        wordsFound: 0,
        packetsCreated: 0,
        poemsGenerated: 0,
        errors: [],
        warnings: []
      };

      // 1. Get next unprocessed chunk
      const chunks = await wordFinderService.getUnprocessedChunks();
      if (chunks.length === 0) {
        this.state.status = 'complete';
        return result;
      }

      const chunk = chunks[0];
      result.chunkId = chunk.id;
      this.log('debug', `Processing chunk ${chunk.id} at position ${chunk.position}`);

      // 2. Find words in chunk
      const wordIds = await wordFinderService.processChunk(chunk.content, chunk.position);
      result.wordsFound = wordIds.length;
      this.state.processedWords += wordIds.length;
      this.log('info', `Found ${wordIds.length} words in chunk`);

      // 3. Create word packets if we have enough words
      if (wordIds.length > 0) {
        const packetIds = await wordPacketService.createPackets({
          minSize: 5,
          maxSize: 10,
          preferRelated: true
        });
        result.packetsCreated = packetIds.length;
        this.state.activePackets += packetIds.length;
        this.log('debug', `Created ${packetIds.length} word packets`);

        // 4. Try to generate poems from new packets
        let poemsGenerated = 0;
        for (const packetId of packetIds) {
          try {
            this.log('debug', `Attempting to generate poem from packet ${packetId}`);
            await poetryService.generatePoem(packetId);
            poemsGenerated++;
            this.state.completedPoems++;
            this.log('info', `Successfully generated poem ${poemsGenerated}/${packetIds.length}`);
          } catch (error) {
            const warning = `Failed to generate poem for packet ${packetId}: ${error}`;
            this.log('error', warning);
            result.warnings?.push(warning);
          }
        }
        result.poemsGenerated = poemsGenerated;
      }

      // Update state
      this.state.currentChunk++;
      
      // Add delay if configured
      if (this.delayBetweenSteps > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delayBetweenSteps));
      }

      return result;
    } catch (error) {
      this.state.status = 'error';
      this.state.lastError = error as Error;
      throw error;
    }
  }

  getCurrentState(): ProcessingState {
    return { ...this.state };
  }

  pause(): void {
    this.isPaused = true;
    this.state.status = 'paused';
    this.log('info', 'Processing paused');
  }

  resume(): void {
    this.isPaused = false;
    this.state.status = 'ready';
    this.log('info', 'Processing resumed');
  }

  async reset(): Promise<void> {
    this.log('info', 'Resetting all services...');
    
    await Promise.all([
      wordFinderService.reset(),
      wordPacketService.reset(),
      poetryService.reset()
    ]);

    this.state = {
      currentChunk: 0,
      totalChunks: 0,
      processedWords: 0,
      activePackets: 0,
      completedPoems: 0,
      status: 'ready'
    };

    this.isPaused = false;
    this.log('info', 'Reset complete');
  }

  setLoggingLevel(level: 'debug' | 'info' | 'error'): void {
    this.loggingLevel = level;
  }

  setDelayBetweenSteps(ms: number): void {
    this.delayBetweenSteps = ms;
  }

  private log(level: 'debug' | 'info' | 'error', message: string): void {
    const levels = { debug: 0, info: 1, error: 2 };
    if (levels[level] >= levels[this.loggingLevel]) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    }
  }
}

// Export singleton instance
export const stepController = new StepController(); 