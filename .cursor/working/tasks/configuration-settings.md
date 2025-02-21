# Configuration Settings To Review

## Word Packet Size Settings
Currently in `src/word-finder/WordPacketService.ts`:
```typescript
const DEFAULT_OPTIONS: Required<PacketOptions> = {
  minSize: 5,    // Temporarily reduced for testing
  maxSize: 10,   // Temporarily reduced for testing
  preferRelated: true
};
```

### Testing Plan
- [x] Test with smaller packets (5-10 words)
  - ✓ Basic functionality working
  - ✓ Poetry generation successful
  - ✓ Quick iteration time
  - [ ] Need to document quality metrics
- [ ] Test with medium packets (20-30 words)
  - [ ] Poetry coherence
  - [ ] Word relationship patterns
  - [ ] Processing time impact
- [ ] Test with large packets (90-100 words)
  - [ ] Complex narrative capability
  - [ ] Theme consistency
  - [ ] API token limits

### Quality Metrics to Track
1. Word Usage
   - % of packet words used
   - Order maintenance
   - Semantic relevance
2. Poetry Quality
   - Coherence
   - Theme consistency
   - Creative use of words
3. Performance
   - Processing time
   - API costs
   - Error rates

## Chunk Size Settings
Currently in `src/scripts/load-real-chunks.ts`:
- Taking first 100 characters from each chunk

### Testing Plan
- [ ] Test with small chunks (100 chars)
  - ✓ Basic word finding working
  - ✓ Processing speed good
  - [ ] Need to measure word density
- [ ] Test with medium chunks (200-500 chars)
  - [ ] Word finding effectiveness
  - [ ] Processing time impact
  - [ ] Memory usage
- [ ] Test with large chunks (1000+ chars)
  - [ ] Word pattern discovery
  - [ ] Performance scaling
  - [ ] Memory constraints

## Configuration Priority List
1. Immediate (Next Session)
   - [ ] Create config.ts for centralized settings
   - [ ] Add CLI flags for packet/chunk sizes
   - [ ] Document current findings

2. Short Term
   - [ ] Test medium packet sizes
   - [ ] Implement config validation
   - [ ] Add environment overrides

3. Long Term
   - [ ] Create configuration UI
   - [ ] Add preset configurations
   - [ ] Implement auto-tuning

## Testing Notes
- Start with small packets (5-10 words)
  - Good for rapid testing
  - Quick feedback loop
  - Easy to debug
- Use test-step-mode.ts for verification
  - Helps track word usage
  - Shows OpenAI responses
  - Validates order maintenance
- Document quality metrics
  - Save example outputs
  - Note processing times
  - Track error rates

## Command Line Arguments (Planned)
```bash
# Packet size control
--min-packet-size=5
--max-packet-size=10
--prefer-related=true

# Chunk size control
--chunk-size=100
--max-chunks=3

# Poetry options
--style=free_verse|haiku|limerick
--temperature=0.7
```

## Remember
- Smaller packets = faster testing cycles
- Larger packets = more context for poetry
- Need to find sweet spot between size and quality
- Document all findings
- Track API costs at different sizes 