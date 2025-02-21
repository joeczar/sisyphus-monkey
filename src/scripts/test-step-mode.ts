import { stepController } from '../control/StepController';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { poetryService } from '../poetry/PoetryService';
import { sqliteService } from '../db/SQLiteService';

interface WordWithPosition {
  value: string;
  position: number;
}

// Add a logging wrapper for the poetry service
const originalAnalyzePacket = poetryService.analyzePacket.bind(poetryService);
poetryService.analyzePacket = async function(...args) {
  console.log('\n🔍 ANALYZING PACKET');
  console.log('==================');
  const [packetId] = args;
  const words = await sqliteService.getPacketWordsWithPositions(packetId);
  console.log('Words in packet:', words.map(w => `${w.value}@${w.position}`).join(', '));
  
  // Intercept the OpenAI call by temporarily replacing console.log
  const originalLog = console.log;
  let promptCapture = '';
  let responseCapture = '';
  let isCapturingPrompt = false;
  let isCapturingResponse = false;
  
  console.log = function(...args) {
    const message = args.join(' ');
    if (message.includes('Sending Analysis Prompt to OpenAI')) {
      isCapturingPrompt = true;
      isCapturingResponse = false;
      promptCapture = '';
    } else if (message.includes('OpenAI Analysis Response')) {
      isCapturingPrompt = false;
      isCapturingResponse = true;
      responseCapture = '';
    } else if (isCapturingPrompt) {
      promptCapture += message + '\n';
    } else if (isCapturingResponse) {
      responseCapture += message + '\n';
    }
  };
  
  const result = await originalAnalyzePacket.apply(this, args);
  
  // Restore original console.log and display captured data
  console.log = originalLog;
  
  if (promptCapture) {
    console.log('\n🤖 Analysis Prompt:');
    console.log('---------------');
    console.log(promptCapture.trim());
  }
  
  if (responseCapture) {
    console.log('\n🤖 Analysis Response:');
    console.log('-----------------');
    console.log(responseCapture.trim());
  }
  
  console.log('\nAnalysis Result:');
  console.log('--------------');
  console.log('Can create poem:', result.canCreatePoem);
  console.log('Usable words:', result.usableWords.join(', '));
  console.log('Unusable words:', result.unusableWords.join(', '));
  if (result.reason) console.log('Reason:', result.reason);
  
  return result;
};

const originalGeneratePoem = poetryService.generatePoem.bind(poetryService);
poetryService.generatePoem = async function(...args) {
  console.log('\n📝 GENERATING POEM');
  console.log('=================');
  const [packetId] = args;
  const words = await sqliteService.getPacketWordsWithPositions(packetId);
  console.log('Words in packet:', words.map(w => `${w.value}@${w.position}`).join(', '));
  
  // Intercept the OpenAI call by temporarily replacing console.log
  const originalLog = console.log;
  let promptCapture = '';
  let responseCapture = '';
  let isCapturingPrompt = false;
  let isCapturingResponse = false;
  
  console.log = function(...args) {
    const message = args.join(' ');
    if (message.includes('Sending Poem Generation Prompt to OpenAI')) {
      isCapturingPrompt = true;
      isCapturingResponse = false;
      promptCapture = '';
    } else if (message.includes('OpenAI Poem Generation Response')) {
      isCapturingPrompt = false;
      isCapturingResponse = true;
      responseCapture = '';
    } else if (isCapturingPrompt) {
      promptCapture += message + '\n';
    } else if (isCapturingResponse) {
      responseCapture += message + '\n';
    }
  };
  
  const result = await originalGeneratePoem.apply(this, args);
  
  // Restore original console.log and display captured data
  console.log = originalLog;
  
  if (promptCapture) {
    console.log('\n🤖 Generation Prompt:');
    console.log('------------------');
    console.log(promptCapture.trim());
  }
  
  if (responseCapture) {
    console.log('\n�� Generated Poem:');
    console.log('----------------');
    console.log(responseCapture.trim());
  }
  
  console.log('\nWord Usage:');
  console.log('-----------');
  result.words.forEach(word => {
    console.log(`- "${word.value}" at position ${word.originalPosition}${word.isRecommended ? ' (recommended)' : ''}`);
  });
  
  console.log('\nVerification:');
  console.log('-------------');
  console.log('All words from dataset:', result.verification.allWordsFromDataset);
  console.log('Maintains order:', result.verification.maintainsOrder);
  if (result.verification.orderViolations.length > 0) {
    console.log('Order violations:', result.verification.orderViolations);
  }
  if (result.verification.unknownWords.length > 0) {
    console.log('Unknown words:', result.verification.unknownWords);
  }
  
  return result;
};

async function waitForEnter(prompt: string = 'Press Enter to continue...') {
  const rl = createInterface({ input, output });
  await rl.question(prompt);
  rl.close();
}

async function runTest() {
  try {
    // Set debug logging but no automatic delay
    stepController.setLoggingLevel('debug');
    
    // Initialize the controller
    console.log('\nInitializing controller...');
    await stepController.initialize();
    
    let state = stepController.getCurrentState();
    console.log(`\nReady to process ${state.totalChunks} chunks`);
    
    // Process chunks one at a time with manual control
    while (state.status !== 'complete') {
      await waitForEnter('\nPress Enter to process next chunk (Ctrl+C to exit)...');
      
      console.log('\nProcessing next chunk...');
      const result = await stepController.processNextChunk();
      
      // Log the results
      console.log('\nProcessing result:');
      console.log('----------------');
      console.log(`Chunk ID: ${result.chunkId}`);
      console.log(`Words found: ${result.wordsFound}`);
      console.log(`Packets created: ${result.packetsCreated}`);
      console.log(`Poems generated: ${result.poemsGenerated}`);
      
      if (result.warnings && result.warnings.length > 0) {
        console.log('\nWarnings:');
        result.warnings.forEach(warning => console.log(`- ${warning}`));
      }
      
      // Get and display updated state
      state = stepController.getCurrentState();
      console.log('\nCurrent state:');
      console.log('-------------');
      console.log(`Status: ${state.status}`);
      console.log(`Progress: ${state.currentChunk}/${state.totalChunks} chunks`);
      console.log(`Total words found: ${state.processedWords}`);
      console.log(`Active packets: ${state.activePackets}`);
      console.log(`Completed poems: ${state.completedPoems}`);
    }
    
    console.log('\nProcessing complete!');
    
  } catch (error) {
    console.error('\nTest failed:', error);
    
    // Get final state in case of error
    const finalState = stepController.getCurrentState();
    console.log('\nFinal state:', finalState);
  }
}

// Run the test
runTest(); 