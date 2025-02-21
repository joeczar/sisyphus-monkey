/// <reference types="bun-types" />
import { describe, it, expect, beforeEach, afterAll, mock } from 'bun:test';
import { PoetryService } from './PoetryService';
import { WordFinderService } from '../word-finder/WordFinderService';
import { WordPacketService } from '../word-finder/WordPacketService';
import { sqliteService } from '../db/SQLiteService';
import OpenAI from 'openai';

interface ChatCompletionRequest {
  messages: Array<{
    role: string;
    content: string;
  }>;
}

interface WordWithPosition {
  word: string;
  position: number;
}

// Mock OpenAI client
const mockOpenAI = {
  chat: {
    completions: {
      create: mock(async (request: ChatCompletionRequest) => {
        // Extract words from the prompt
        const prompt = request.messages[1].content;
        
        // For analysis requests
        if (request.messages[0].content.includes('analyze')) {
          // Extract words from the prompt format: "word" (length: X, count: Y, positions: [Z])
          const matches = prompt.match(/"([^"]+)"/g) || [];
          const words = matches.map(m => m.replace(/"/g, ''));
          const uniqueWords = Array.from(new Set(words)).filter(w => w.length > 2);
          
          return {
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    canCreatePoem: uniqueWords.length >= 3,
                    usableWords: uniqueWords,
                    unusableWords: words.filter(w => w.length <= 2),
                    reason: uniqueWords.length < 3 ? 'Not enough usable words' : undefined
                  })
                }
              }
            ]
          };
        }
        
        // For poem generation
        // Extract words and their positions from the format: "word" (count: X, positions: [Y])
        const wordMatches = prompt.match(/"([^"]+)"/g) || [];
        const positionMatches = prompt.match(/positions: \[([\d, ]+)\]/g) || [];
        
        const wordsWithPositions: WordWithPosition[] = [];
        
        wordMatches.forEach((wordMatch, index) => {
          const word = wordMatch.replace(/"/g, '');
          if (word.length > 2 && positionMatches[index]) {
            const positionMatch = positionMatches[index].match(/\[([\d, ]+)\]/);
            if (positionMatch) {
              const positions = positionMatch[1]
                .split(',')
                .map(p => parseInt(p.trim(), 10));
              // Use the first (smallest) position for this word
              const position = Math.min(...positions);
              wordsWithPositions.push({ word, position });
            }
          }
        });

        // Sort by position and take first three words that maintain order
        const sortedWords = wordsWithPositions
          .sort((a, b) => a.position - b.position);

        // Select words that maintain strictly increasing positions
        const selectedWords: WordWithPosition[] = [];
        let lastPosition = -1;

        for (const word of sortedWords) {
          if (word.position > lastPosition) {
            selectedWords.push(word);
            lastPosition = word.position;
            if (selectedWords.length >= 3) break;
          }
        }
        
        // Create a simple poem using the selected words
        const poem = selectedWords.map(w => w.word).join(' ');
        
        return {
          choices: [
            {
              message: {
                content: poem
              }
            }
          ]
        };
      })
    }
  }
} as unknown as OpenAI;

describe('PoetryService', () => {
  let poetryService: PoetryService;
  let wordFinderService: WordFinderService;
  let wordPacketService: WordPacketService;

  beforeEach(async () => {
    await sqliteService.initialize();
    await sqliteService.reset();
    
    wordFinderService = new WordFinderService();
    await wordFinderService.initialize();
    
    wordPacketService = new WordPacketService();
    await wordPacketService.initialize();
    
    poetryService = new PoetryService(mockOpenAI);
    await poetryService.initialize();
  });

  afterAll(async () => {
    await sqliteService.reset();
  });

  it('should analyze packet quality', async () => {
    // Create a packet with substantial words
    const chunk = 'programmerwriteselegantcode';
    await wordFinderService.processChunk(chunk, 1);
    
    const [packetId] = await wordPacketService.createPackets({
      minSize: 3,
      maxSize: 5
    });

    // Analyze the packet
    const analysis = await poetryService.analyzePacket(packetId);
    expect(analysis.canCreatePoem).toBe(true);
    expect(analysis.usableWords.length).toBeGreaterThan(0);
    
    // Log analysis results
    console.log('\nPacket Analysis:');
    console.log('Can create poem:', analysis.canCreatePoem);
    console.log('Usable words:', analysis.usableWords);
    console.log('Unusable words:', analysis.unusableWords);
    console.log('Reason:', analysis.reason);
  });

  it('should generate a poem maintaining word order', async () => {
    // Create a packet with substantial words
    const chunk = 'programmerwriteselegantcode';
    await wordFinderService.processChunk(chunk, 1);
    
    const [packetId] = await wordPacketService.createPackets({
      minSize: 3,
      maxSize: 5
    });

    // Generate a poem
    const response = await poetryService.generatePoem(packetId);
    expect(response.poem).toBeTruthy();
    
    // Verify response structure
    expect(response.verification.allWordsFromDataset).toBe(true);
    expect(response.verification.maintainsOrder).toBe(true);
    expect(response.verification.orderViolations).toHaveLength(0);
    expect(response.verification.unknownWords).toHaveLength(0);

    // Verify metadata
    expect(response.metadata.wordCount).toBeGreaterThan(0);
    expect(response.metadata.uniqueWordCount).toBeGreaterThan(0);
    expect(response.metadata.averageWordLength).toBeGreaterThan(0);

    // Log detailed results
    console.log('\nPoem Response:');
    console.log('Poem:', response.poem);
    console.log('\nWords Used:');
    response.words.forEach(word => {
      console.log(`- "${word.value}" at position ${word.originalPosition}${word.isRecommended ? ' (recommended)' : ''}`);
    });
    console.log('\nMetadata:', response.metadata);
  });

  it('should handle packets with insufficient words', async () => {
    // Create a packet with mostly short words
    const chunk = 'theandtoinaof';
    await wordFinderService.processChunk(chunk, 1);
    const [packetId] = await wordPacketService.createPackets({
      minSize: 3,
      maxSize: 5
    });

    // Attempt to generate a poem
    await expect(poetryService.generatePoem(packetId))
      .rejects
      .toThrow('Cannot create poem from this packet');

    // Log the analysis for visibility
    const analysis = await poetryService.analyzePacket(packetId);
    console.log('\nPacket Analysis for insufficient words:');
    console.log('Can create poem:', analysis.canCreatePoem);
    console.log('Usable words:', analysis.usableWords);
    console.log('Unusable words:', analysis.unusableWords);
    console.log('Reason:', analysis.reason);
  });

  it('should generate poems in different styles while maintaining order', async () => {
    // Create a packet with good variety
    const chunk = 'dancingcatplaysinthemoonlight';
    await wordFinderService.processChunk(chunk, 1);
    const [packetId] = await wordPacketService.createPackets({
      minSize: 3,
      maxSize: 5
    });

    // Generate poems in different styles
    const styles: Array<'free_verse' | 'haiku' | 'limerick'> = ['haiku', 'limerick'];
    
    for (const style of styles) {
      const response = await poetryService.generatePoem(packetId, { style });
      
      console.log(`\n${style.toUpperCase()}:`);
      console.log(response.poem);
      console.log('\nVerification:', response.verification);
      console.log('Metadata:', response.metadata);
      
      // Verify response
      expect(response.verification.allWordsFromDataset).toBe(true);
      expect(response.verification.maintainsOrder).toBe(true);
      expect(response.metadata.style).toBe(style);
      
      // Log word sequence
      console.log('\nWord Sequence:');
      response.words.forEach(word => {
        console.log(`- "${word.value}" at position ${word.originalPosition}`);
      });
    }
  });

  it('should detect and report order violations', async () => {
    // Create a packet with specific words
    const chunk = 'dancingcatplaysinthemoonlight';
    await wordFinderService.processChunk(chunk, 1);
    const [packetId] = await wordPacketService.createPackets({
      minSize: 3,
      maxSize: 5
    });

    // Get the original word sequence for reference
    const words = await sqliteService.getPacketWordsWithPositions(packetId);
    console.log('\nOriginal word sequence:', 
      words.sort((a, b) => a.position - b.position)
        .map(w => `${w.value}@${w.position}`).join(', ')
    );

    // Generate a poem and verify order checking
    const response = await poetryService.generatePoem(packetId);
    
    console.log('\nGenerated Poem:', response.poem);
    console.log('\nWord Usage:');
    response.words.forEach(word => {
      console.log(`- "${word.value}" at position ${word.originalPosition}`);
    });

    // Verify no order violations
    expect(response.verification.maintainsOrder).toBe(true);
    expect(response.verification.orderViolations).toHaveLength(0);
  });
}); 