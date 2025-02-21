import OpenAI from 'openai';
import { sqliteService } from '../db/SQLiteService';
import type { WordPacket, Word } from '../db/SQLiteService';
import { displayService } from '../utils/DisplayService';
import chalk from 'chalk';

const SCROLL_SPEED = 100;  

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
  maxLength: 500,
  minWordsToUse: 10,
  minWordLength: 4
};

export class PoetryService {
  private initialized = false;
  private currentIteration = 1;
  private openai: OpenAI;

  constructor(openaiClient?: OpenAI) {
    if (!process.env.OPENAI_API_KEY) {
      console.error('⚠️ OPENAI_API_KEY environment variable is not set!');
    }
    this.openai = openaiClient || new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    // Validate OpenAI setup
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable must be set');
    }
    
    await sqliteService.initialize();
    this.initialized = true;
    console.log('🔧 PoetryService initialized with OpenAI API key:', 
      process.env.OPENAI_API_KEY?.slice(0, 3) + '...' + 
      process.env.OPENAI_API_KEY?.slice(-3));
  }

  /**
   * Analyzes a word packet to determine if it can be used to create a poem
   */
  async analyzePacket(packetId: string, options: PoetryOptions = {}): Promise<PacketAnalysis> {
    if (!this.initialized) {
      throw new Error('PoetryService not initialized');
    }

    const opts = { ...DEFAULT_OPTIONS, ...options };

    await displayService.scrollText('\n🔍 ANALYZING WORD PACKET', {
      color: 'cyan',
      style: 'bold',
      speed: SCROLL_SPEED
    });
    console.log('=======================');

    // Get the aggregated words
    const words = await this.aggregatePacketWords(packetId);
    
    // Display words in sequence
    await displayService.scrollText('\nWords in sequence:', {
      color: 'yellow',
      style: 'bold',
      speed: SCROLL_SPEED
    });
    console.log('----------------');
    for (const w of words) {
      await displayService.scrollText(
        `${w.value.padEnd(15)} | pos: ${w.positions.join(', ').padEnd(10)} | count: ${w.count} | len: ${w.length}`,
        { color: 'green', speed: SCROLL_SPEED }
      );
    }

    // Create the analysis prompt
    const prompt = this.createAnalysisPrompt(words, opts);
    await displayService.scrollText('\n🤖 Sending Analysis Prompt to OpenAI', {
      color: 'blue',
      style: 'bold',
      speed: SCROLL_SPEED
    });
    console.log('--------------------------------');
    await displayService.paginateText(prompt, {
      color: 'dim',
      linesPerPage: 10,
      header: 'Analysis Prompt',
      pageNumbers: true
    });
    
    try {
      console.log('\n🔍 DEBUG: Sending analysis request to OpenAI...');
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

Return your analysis as a valid JSON object WITHOUT any markdown formatting.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0,
        max_tokens: 500,
      });

      console.log('\n🔍 DEBUG: Raw OpenAI completion response:', JSON.stringify(completion, null, 2));
      console.log('\n🔍 DEBUG: First choice message:', completion.choices[0]?.message);
      console.log('\n🔍 DEBUG: Content from first choice:', completion.choices[0]?.message.content);

      console.log('\n🤖 OpenAI Analysis Response');
      console.log('-------------------------');
      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error("No content received from OpenAI");
      }
      await displayService.paginateText(content, {
        color: 'cyan',
        header: 'OpenAI Response',
        linesPerPage: 10,
        pageNumbers: true
      });

      try {
        const analysis = this.parseJSONResponse<any>(content);
        await displayService.scrollText('\n📊 Analysis Results', {
          color: 'magenta',
          style: 'bold',
          speed: 30
        });
        console.log('----------------');
        console.log('Can create poem:', analysis.canCreatePoem ? chalk.green('✅ Yes') : chalk.red('❌ No'));
        
        await displayService.scrollText('\nUsable words:', { color: 'green', style: 'bold' });
        for (const word of analysis.usableWords) {
          const info = words.find(w => w.value === word);
          if (info) {
            await displayService.scrollText(
              `  ✨ ${word.padEnd(15)} | pos: ${info.positions.join(', ')}`,
              { color: 'green', speed: 20 }
            );
          }
        }

        await displayService.scrollText('\nUnusable words:', { color: 'red', style: 'bold' });
        for (const word of analysis.unusableWords) {
          await displayService.scrollText(`  ❌ ${word}`, { color: 'red', speed: 20 });
        }

        if (analysis.reason) {
          await displayService.scrollText('\nReason: ' + analysis.reason, {
            color: 'yellow',
            style: 'italic',
            speed: 30
          });
        }
        
        return {
          canCreatePoem: analysis.canCreatePoem || false,
          usableWords: analysis.usableWords || [],
          unusableWords: analysis.unusableWords || [],
          reason: analysis.reason
        };
      } catch (error) {
        console.error(chalk.red('Failed to parse OpenAI response:'), error);
        console.error(chalk.red('Raw response:'), content);
        throw new Error(`Failed to parse analysis response: ${error}`);
      }
    } catch (error) {
      console.error(chalk.red('OpenAI API Error:'), error);
      throw error;
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

    await displayService.scrollText('\n📝 GENERATING POEM', {
      color: 'magenta',
      style: 'bold',
      speed: 30
    });
    console.log('=================');

    // First analyze the packet
    await displayService.scrollText('\nStep 1: Analyzing word packet...', {
      color: 'cyan',
      style: 'italic'
    });
    const analysis = await this.analyzePacket(packetId, opts);
    if (!analysis.canCreatePoem) {
      await displayService.scrollText('\n❌ Cannot create poem: ' + analysis.reason, {
        color: 'red',
        style: 'bold'
      });
      throw new Error(`Cannot create poem from this packet: ${analysis.reason}`);
    }
    await displayService.scrollText('\n✅ Packet analysis complete', {
      color: 'green',
      style: 'bold'
    });

    // Get the aggregated words
    const words = await this.aggregatePacketWords(packetId);
    await displayService.scrollText('\nStep 2: Preparing word sequence...', {
      color: 'cyan',
      style: 'italic'
    });
    await displayService.scrollText('Available words in order:', {
      color: 'yellow',
      style: 'bold'
    });
    for (const w of words) {
      const isUsable = analysis.usableWords.includes(w.value);
      await displayService.scrollText(
        `  ${isUsable ? '✨' : '  '} ${w.value.padEnd(15)} | pos: ${w.positions.join(', ')}`,
        { color: isUsable ? 'green' : 'dim', speed: 10 }
      );
    }

    // Generate the poem
    await displayService.scrollText('\nStep 3: Generating poem...', {
      color: 'cyan',
      style: 'italic'
    });
    const prompt = this.createPoemPrompt(words, analysis.usableWords, opts);
    await displayService.scrollText('\n🤖 Sending Generation Prompt to OpenAI', {
      color: 'blue',
      style: 'bold'
    });
    console.log('----------------------------------');
    await displayService.paginateText(prompt, {
      color: 'dim',
      header: 'Generation Prompt',
      linesPerPage: 10,
      pageNumbers: true
    });
    
    try {
      console.log('\n🔍 DEBUG: Sending poem generation request to OpenAI...');
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `You are a skilled poet who creates \"found poetry\" by selecting words from a sequence.
IMPORTANT: You MUST maintain the original order of the words. You can skip words, but you cannot change their order.
For example, if given: [the (positions: [1,4]), cat (position: 2), sat (position: 3), mat (position: 5)]
Valid: \"the sat mat\" (skips 'cat' and second 'the')
Invalid: \"mat sat cat\" (changes order)
Focus on using the recommended usable words while maintaining their sequence.

Try to use at least 30% of the available words to create a meaningful and substantial poem.
Return ONLY the poem text, without any markdown formatting or additional commentary.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: opts.temperature,
        max_tokens: Math.floor(opts.maxLength),
      });

      console.log('\n🔍 DEBUG: Raw OpenAI completion response:', JSON.stringify(completion, null, 2));
      console.log('\n🔍 DEBUG: First choice message:', completion.choices[0]?.message);
      console.log('\n🔍 DEBUG: Content from first choice:', completion.choices[0]?.message.content);

      await displayService.scrollText('\n🤖 Generated Poem', {
        color: 'magenta',
        style: 'bold'
      });
      console.log('--------------------------');
      const poem = completion.choices[0].message.content?.trim();
      if (!poem) {
        throw new Error("No poem content received from OpenAI");
      }

      // Display the poem with nice formatting
      await displayService.paginateText(poem, {
        color: 'yellow',
        style: 'italic',
        header: '✨ Found Poetry ✨',
        footer: '~ Generated by Sisyphus Monkey ~',
        linesPerPage: 20,
        pageNumbers: true
      });

      // Verify and create response
      await displayService.scrollText('\nStep 4: Verifying poem...', {
        color: 'cyan',
        style: 'italic'
      });
      const response = this.verifyAndCreateResponse(poem, words, analysis.usableWords, opts.style);

      await displayService.scrollText('\n📊 Poem Analysis', {
        color: 'blue',
        style: 'bold'
      });
      console.log('--------------');
      await displayService.scrollText('Words used:', { color: 'yellow', style: 'bold' });
      for (const word of response.words) {
        await displayService.scrollText(
          `  ${word.isRecommended ? '✨' : '  '} ${word.value.padEnd(15)} | pos: ${word.originalPosition}`,
          { color: word.isRecommended ? 'green' : 'dim', speed: 20 }
        );
      }

      await displayService.scrollText('\nVerification results:', {
        color: 'yellow',
        style: 'bold'
      });
      console.log(`✓ All words from dataset: ${response.verification.allWordsFromDataset ? chalk.green('✅') : chalk.red('❌')}`);
      console.log(`✓ Maintains word order:   ${response.verification.maintainsOrder ? chalk.green('✅') : chalk.red('❌')}`);
      
      if (response.verification.orderViolations.length > 0) {
        await displayService.scrollText('\nOrder violations:', { color: 'red', style: 'bold' });
        for (const v of response.verification.orderViolations) {
          await displayService.scrollText(
            `❌ "${v.word}" (pos ${v.position}) after "${v.previousWord}" (pos ${v.previousPosition})`,
            { color: 'red', speed: 30 }
          );
        }
      }
      
      if (response.verification.unknownWords.length > 0) {
        await displayService.scrollText('\nUnknown words used:', { color: 'red', style: 'bold' });
        for (const word of response.verification.unknownWords) {
          await displayService.scrollText(`❌ "${word}"`, { color: 'red', speed: 30 });
        }
      }

      await displayService.scrollText('\n📈 Metadata', {
        color: 'blue',
        style: 'bold'
      });
      console.log('---------');
      console.log(`Style:              ${chalk.cyan(response.metadata.style)}`);
      console.log(`Word count:         ${chalk.cyan(response.metadata.wordCount)}`);
      console.log(`Unique words:       ${chalk.cyan(response.metadata.uniqueWordCount)}`);
      console.log(`Avg word length:    ${chalk.cyan(response.metadata.averageWordLength)}`);

      // Only store if verification passes
      if (response.verification.allWordsFromDataset && response.verification.maintainsOrder) {
        await sqliteService.addPoem(poem, opts.style, packetId, this.currentIteration);
        await displayService.scrollText('\n✅ Poem verified and stored', {
          color: 'green',
          style: 'bold'
        });
      } else {
        await displayService.scrollText('\n❌ Poem verification failed:', {
          color: 'red',
          style: 'bold'
        });
        console.error(chalk.red(JSON.stringify(response.verification, null, 2)));
        throw new Error('Generated poem failed verification:\n' + JSON.stringify(response.verification, null, 2));
      }

      return response;
    } catch (error) {
      console.error(chalk.red('\n❌ Poetry generation failed:'), error);
      throw error;
    }
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
        averageWordLength: Number((usedWords.reduce((sum, w) => sum + w.value.length, 0) / usedWords.length).toFixed(2)),
        uniqueWordCount: uniqueWords.size
      }
    };
  }

  /**
   * Parses a JSON response string, removing markdown formatting.
   */
  private parseJSONResponse<T>(response: string): T {
    const jsonStr = response.replace(/```json\n|\n```/g, '').trim();
    return JSON.parse(jsonStr);
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