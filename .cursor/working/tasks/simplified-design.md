# Simplified Sisyphus Monkey Design

## Core Concept
A program that finds meaningful words in random character sequences and creates poetry from them, inspired by the infinite monkey theorem and Sisyphus.

## Simplified Architecture

### 1. Word Finding Component
- Input: JSON files containing random character sequences (existing)
- Process: Simple sliding window algorithm to find valid words
- Validation: Local Webster's Dictionary (JSON format)
- Output: List of found words with their positions

### 2. Poetry Generation
- Input: List of found words in sequence
- Process: Simple LLM prompt to create poetry
- Output: Poems that use the found words in order

## Technical Stack
- Language: TypeScript
- Runtime: Bun
- Dependencies:
  - Webster's Unabridged Dictionary (local JSON)
  - OpenAI API (or similar) for poetry generation
  - Simple file storage (no databases required)

## Data Flow
1. Load dictionary into memory (once at startup)
2. Read character chunks from files
3. Find words using sliding window + dictionary lookup
4. Store valid words with positions
5. Generate poetry from words

## File Structure
```
sisyphus-monkey/
├── src/
│   ├── word-finder/
│   │   ├── index.ts        # Main word finding logic
│   │   ├── dictionary.ts   # Dictionary loading & lookup
│   │   └── types.ts        # Type definitions
│   ├── poetry/
│   │   ├── index.ts        # Poetry generation
│   │   └── prompts.ts      # LLM prompts
│   └── utils/
│       ├── file-reader.ts  # File handling
│       └── logger.ts       # Simple logging
├── data/
│   ├── dictionary/        # Webster's dictionary files
│   ├── char-chunks/       # Input character files
│   ├── found-words/       # Output word files
│   └── poems/            # Generated poems
├── tests/                # Basic test suite
└── config/              # Configuration files
```

## Implementation Steps

### Phase 1: Word Finding (2-3 hours)
1. Download and prepare Webster's dictionary
2. Create dictionary loading & lookup system
3. Implement sliding window algorithm
4. Process character files and save found words

### Phase 2: Poetry Generation (2-3 hours)
1. Set up LLM integration
2. Create poetry generation prompt
3. Generate sample poems
4. Save output

## Performance Optimizations
1. Load dictionary into Set/Map for O(1) lookups
2. Process files in parallel using Bun's capabilities
3. Stream results to avoid memory issues
4. Cache common word lookups

## ADHD-Friendly Features
1. Clear progress indicators in console
2. Small, focused files
3. Simple data flow
4. Minimal configuration needed
5. Quick feedback loop
6. Immediate results (no API delays)

## Success Criteria
- Can process character files and find real words
- Maintains word sequence information
- Generates readable poetry
- Processes files quickly (local dictionary)
- Easy to understand and modify

## Future Extensions (Optional)
1. Web interface for viewing poems
2. Additional poetry styles
3. Word relationship analysis
4. Custom dictionary integration
5. Dictionary word scoring/ranking

## Development Approach
1. Start with minimal implementation
2. Test with small data samples
3. Add features incrementally
4. Focus on core functionality first

## Dictionary Integration Details
1. Dictionary Format:
   ```typescript
   interface DictionaryWord {
     word: string;
     definition?: string;
     partOfSpeech?: string;
   }
   
   type Dictionary = Set<string>; // For fast lookups
   ```

2. Loading Strategy:
   ```typescript
   // Load only words initially
   const dictionary = new Set<string>();
   
   // Load full definitions only when needed
   const definitions = new Map<string, DictionaryWord>();
   ```

3. Lookup Performance:
   - O(1) for word validation
   - O(1) for definition lookup when needed
   - Minimal memory footprint

Would you like to proceed with this simplified version? We can start with any component you prefer. 