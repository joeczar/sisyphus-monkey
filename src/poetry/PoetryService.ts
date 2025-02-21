import OpenAI from 'openai';
import { sqliteService } from '../db/SQLiteService';
import type { WordPacket, Word } from '../db/SQLiteService';

interface PromptWord {
  value: string;
  count: number;
  positions: number[];
  length: number;
}

interface PacketAnalysis {
  canCreatePoem: boolean;
  usableWords: string[];
  unusableWords: string[];
  reason?: string;
}

interface PoemWord {
  value: string;
  originalPosition: number;
  isRecommended: boolean;
}

interface PoemResponse {
  poem: string;
  words: PoemWord[];
  verification: {
    allWordsFromDataset: boolean;
    maintainsOrder: boolean;
    orderViolations: Array<{
      word: string;
      position: number;
      previousWord: string;
      previousPosition: number;
    }>;
    unknownWords: string[];
  };
  metadata: {
    style: string;
    wordCount: number;
    averageWordLength: number;
    uniqueWordCount: number;
  };
}

export interface PoetryOptions {
  style?: 'free_verse' | 'haiku' | 'limerick';
  temperature?: number;  // OpenAI creativity (0-2)
  maxLength?: number;    // Maximum poem length
  minWordsToUse?: number; // Minimum words to use from the packet
  minWordLength?: number; // Minimum length for "substantial" words
}

const DEFAULT_OPTIONS: Required<PoetryOptions> = {
  style: 'free_verse',
  temperature: 0.7,
  maxLength: 200,
  minWordsToUse: 3,
  minWordLength: 4
};

export class PoetryService {
  private initialized = false;
  private currentIteration = 1;
  private openai: OpenAI;

  constructor(openaiClient?: OpenAI) {
    this.openai = openaiClient || new OpenAI();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await sqliteService.initialize();
    this.initialized = true;
  }

  /**
   * Analyzes a word packet to determine if it can be used to create a poem
   */
  async analyzePacket(packetId: string, options: PoetryOptions = {}): Promise<PacketAnalysis> {
    if (!this.initialized) {
      throw new Error('PoetryService not initialized');
    }

    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Get the aggregated words
    const words = await this.aggregatePacketWords(packetId);

    // Create the analysis prompt
    const prompt = this.createAnalysisPrompt(words, opts);
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are a poetry assistant that analyzes word packets.
Please analyze the provided words and return a JSON object with the following structure:
{
  "canCreatePoem": boolean,
  "usableWords": string[],
  "unusableWords": string[],
  "reason": string | undefined
}

Consider a word usable if:
1. It is at least 3 characters long
2. It contributes to meaningful poetry (e.g., nouns, verbs, adjectives, etc.)
3. It can be used in the requested style

Return your analysis as a valid JSON object.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0,
      max_tokens: 500,
    });

    try {
      const analysis = JSON.parse(completion.choices[0].message.content || '{}');
      return {
        canCreatePoem: analysis.canCreatePoem || false,
        usableWords: analysis.usableWords || [],
        unusableWords: analysis.unusableWords || [],
        reason: analysis.reason
      };
    } catch (error) {
      throw new Error(`Failed to parse analysis response: ${error}`);
    }
  }

  /**
   * Generates a poem from a word packet, maintaining original word order
   */
  async generatePoem(packetId: string, options: PoetryOptions = {}): Promise<PoemResponse> {
    if (!this.initialized) {
      throw new Error('PoetryService not initialized');
    }

    const opts = { ...DEFAULT_OPTIONS, ...options };

    // First analyze the packet
    const analysis = await this.analyzePacket(packetId, opts);
    if (!analysis.canCreatePoem) {
      throw new Error(`Cannot create poem from this packet: ${analysis.reason}`);
    }

    // Get the aggregated words
    const words = await this.aggregatePacketWords(packetId);

    // Generate the poem
    const prompt = this.createPoemPrompt(words, analysis.usableWords, opts);
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are a skilled poet who creates "found poetry" by selecting words from a sequence.
IMPORTANT: You MUST maintain the original order of the words. You can skip words, but you cannot change their order.
For example, if given: [the (positions: [1,4]), cat (position: 2), sat (position: 3), mat (position: 5)]
Valid: "the sat mat" (skips 'cat' and second 'the')
Invalid: "mat sat cat" (changes order)
Focus on using the recommended usable words while maintaining their sequence.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: opts.temperature,
      max_tokens: Math.floor(opts.maxLength / 2),
    });

    const poem = completion.choices[0].message.content?.trim() || '';

    // Verify and create response
    const response = this.verifyAndCreateResponse(poem, words, analysis.usableWords, opts.style);

    // Only store if verification passes
    if (response.verification.allWordsFromDataset && response.verification.maintainsOrder) {
      await sqliteService.addPoem(poem, opts.style, packetId, this.currentIteration);
    } else {
      throw new Error('Generated poem failed verification:\n' + JSON.stringify(response.verification, null, 2));
    }

    return response;
  }

  /**
   * Aggregates words from a packet, removing duplicates but tracking counts and positions
   */
  private async aggregatePacketWords(packetId: string): Promise<PromptWord[]> {
    const rawWords = await sqliteService.getPacketWordsWithPositions(packetId);
    const wordMap = new Map<string, PromptWord>();

    // Group words by value, tracking counts and positions
    rawWords.forEach(({ value, position }) => {
      const existing = wordMap.get(value);
      if (existing) {
        existing.count++;
        existing.positions.push(position);
      } else {
        wordMap.set(value, {
          value,
          count: 1,
          positions: [position],
          length: value.length
        });
      }
    });

    return Array.from(wordMap.values())
      .sort((a, b) => Math.min(...a.positions) - Math.min(...b.positions));
  }

  /**
   * Creates a prompt for packet analysis
   */
  private createAnalysisPrompt(words: PromptWord[], options: Required<PoetryOptions>): string {
    return `Please analyze these words for creating a poem:

Words (in sequence order):
${words.map(w => `"${w.value}" (length: ${w.length}, count: ${w.count}, positions: [${w.positions.join(', ')}])`).join('\n')}

Consider:
1. Word variety and complexity
2. Potential for meaningful combinations
3. Sequential constraints (words must be used in order of position)
4. Whether there are enough substantial words

Determine if these words can make a meaningful poem, and identify which words would be most useful.`;
  }

  /**
   * Creates a prompt for poem generation
   */
  private createPoemPrompt(words: PromptWord[], usableWords: string[], options: Required<PoetryOptions>): string {
    const styleInstructions = {
      free_verse: "Create a free verse poem",
      haiku: "Create a haiku (5-7-5 syllables)",
      limerick: "Create a limerick (AABBA rhyme scheme)"
    };

    return `${styleInstructions[options.style]} using words from this sequence:

Available words (in order):
${words.map(w => `"${w.value}" (count: ${w.count}, positions: [${w.positions.join(', ')}])`).join('\n')}

Recommended words to focus on:
${usableWords.join(', ')}

Rules:
1. You MUST use at least ${options.minWordsToUse} words
2. Words MUST appear in the same order as their positions
3. You can use basic punctuation and line breaks
4. You CANNOT add any words not in the list
5. Focus on using the recommended words, but you can use others if needed

The poem should be creative and meaningful while strictly following these rules.`;
  }

  /**
   * Verifies a poem and creates a structured response
   */
  private verifyAndCreateResponse(
    poem: string,
    availableWords: PromptWord[],
    recommendedWords: string[],
    style: string
  ): PoemResponse {
    // Extract words from poem
    const poemWords = poem.toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 0);

    const usedWords: PoemWord[] = [];
    const unknownWords: string[] = [];
    const orderViolations: PoemResponse['verification']['orderViolations'] = [];
    let currentPosition = -1;

    // Analyze each word
    for (const word of poemWords) {
      const wordInfo = availableWords.find(w => w.value === word);
      
      if (!wordInfo) {
        unknownWords.push(word);
        continue;
      }

      // Find next valid position
      const nextPosition = wordInfo.positions.find(p => p > currentPosition);
      
      if (!nextPosition && currentPosition !== -1) { // Only check order violations after first word
        orderViolations.push({
          word,
          position: Math.min(...wordInfo.positions),
          previousWord: usedWords[usedWords.length - 1]?.value || '',
          previousPosition: currentPosition
        });
      } else {
        currentPosition = nextPosition || Math.min(...wordInfo.positions);
      }

      usedWords.push({
        value: word,
        originalPosition: nextPosition || Math.min(...wordInfo.positions),
        isRecommended: recommendedWords.includes(word)
      });
    }

    // Calculate metadata
    const uniqueWords = new Set(usedWords.map(w => w.value));

    return {
      poem,
      words: usedWords,
      verification: {
        allWordsFromDataset: unknownWords.length === 0,
        maintainsOrder: orderViolations.length === 0,
        orderViolations,
        unknownWords
      },
      metadata: {
        style,
        wordCount: usedWords.length,
        averageWordLength: usedWords.reduce((sum, w) => sum + w.value.length, 0) / usedWords.length,
        uniqueWordCount: uniqueWords.size
      }
    };
  }

  async getUnprocessedPackets(): Promise<WordPacket[]> {
    return sqliteService.getUnprocessedPackets();
  }

  async getPoemsByIteration(iteration: number) {
    return sqliteService.getPoemsByIteration(iteration);
  }

  setIteration(iteration: number): void {
    this.currentIteration = iteration;
  }

  async reset(): Promise<void> {
    this.initialized = false;
    this.currentIteration = 1;
  }
}

// Export singleton instance
export const poetryService = new PoetryService(); 