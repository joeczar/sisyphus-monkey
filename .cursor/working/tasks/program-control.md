# Program Control Design

## Step Mode (Development/Testing)

### Interface
```typescript
interface StepController {
  // Core operations
  initialize(): Promise<void>;
  processNextChunk(): Promise<ProcessingResult>;
  getCurrentState(): ProcessingState;
  
  // Control
  pause(): void;
  resume(): void;
  reset(): Promise<void>;
  
  // Configuration
  setLoggingLevel(level: 'debug' | 'info' | 'error'): void;
  setDelayBetweenSteps(ms: number): void;
}

interface ProcessingResult {
  chunkId: string;
  wordsFound: number;
  packetsCreated: number;
  poemsGenerated: number;
  errors?: Error[];
  warnings?: string[];
}

interface ProcessingState {
  currentChunk: number;
  totalChunks: number;
  processedWords: number;
  activePackets: number;
  completedPoems: number;
  lastError?: Error;
  status: 'ready' | 'processing' | 'paused' | 'error' | 'complete';
}
```

### Usage Example
```typescript
const controller = new StepController();
await controller.initialize();

// Process one chunk
const result = await controller.processNextChunk();
console.log('Chunk processed:', result);

// Check current state
const state = controller.getCurrentState();
console.log('Current state:', state);
```

## Continuous Mode (Production)

### Interface
```typescript
interface ProcessController {
  // Core operations
  start(): Promise<void>;
  stop(): Promise<void>;
  
  // Monitoring
  getStatus(): ProcessingStatus;
  getMetrics(): ProcessingMetrics;
  
  // Error handling
  setErrorHandler(handler: ErrorHandler): void;
  setRetryStrategy(strategy: RetryStrategy): void;
}

interface ProcessingStatus {
  status: 'running' | 'stopped' | 'error' | 'complete';
  currentChunk: number;
  totalChunks: number;
  errorCount: number;
  lastError?: Error;
  networkStatus: 'connected' | 'disconnected' | 'degraded';
}

interface ProcessingMetrics {
  chunksProcessed: number;
  wordsFound: number;
  packetsCreated: number;
  poemsGenerated: number;
  averageProcessingTime: number;
  errorRate: number;
  retryCount: number;
}
```

### Error Handling
```typescript
interface RetryStrategy {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  shouldRetry: (error: Error) => boolean;
}

interface ErrorHandler {
  handleNetworkError: (error: Error) => Promise<void>;
  handleAPIError: (error: Error) => Promise<void>;
  handleSystemError: (error: Error) => Promise<void>;
}
```

## Implementation Strategy

### 1. Step Mode Implementation
- Use SQLite to track progress and state
- Implement detailed logging for each operation
- Add debug points for inspection
- Include mock API responses for testing

### 2. Continuous Mode Implementation
- Add exponential backoff for retries
- Implement connection pooling for API calls
- Add health checks for external services
- Include automatic recovery mechanisms

### 3. Shared Components
- State management
- Progress tracking
- Metrics collection
- Error logging

## Error Recovery Strategy

1. **Network Issues**:
   - Exponential backoff
   - Connection pooling
   - Request queuing
   - Automatic retry for idempotent operations

2. **API Rate Limits**:
   - Token bucket implementation
   - Request throttling
   - Queue management
   - Parallel processing control

3. **System Errors**:
   - State persistence
   - Checkpoint creation
   - Automatic rollback
   - Progress recovery

## Progress Tracking

1. **Checkpoints**:
   - Save state after each chunk
   - Track completed operations
   - Store error context
   - Enable resume from last good state

2. **Metrics**:
   - Processing speed
   - Success/failure rates
   - Resource usage
   - API quota consumption

## Next Steps

1. Implement basic Step Mode controller
2. Add detailed logging and state tracking
3. Create test suite for step-by-step processing
4. Build continuous mode on top of step mode
5. Add robust error handling and recovery
6. Implement metrics and monitoring 