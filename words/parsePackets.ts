import { packetService } from '../db/neo4j/PacketService';
import { Channel } from '../state/BaseState';
import { wordsState } from '../state/WordsState';

const BATCH_SIZE = 50;
let fetchPackets = false;
export const parsePackets = async () => {
  console.log('Parsing packets...');
  wordsState.subscribeToChannel(Channel.chars, async (message) => {
    console.log('Received message:', message);
    if (message) {
      const state = JSON.parse(message);
      console.log('Received state:', state);
    }
  });
};

// const packets = packetService.getPackets(BATCH_SIZE)
