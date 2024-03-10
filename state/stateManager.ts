import type { Packet } from '../characters/packet.type';
import { PacketChannelService } from '../words/RedisWordService';

export type StateType = {
  isConnected: boolean;
  rateLimit: number;
  packetsProcessed: number[];
  wordsProcessed: string[];
  lastPacket: number;
  lastWord: { number: number; word: string };
  totalCharacters: number;
  totalWords: number;
};

class State {
  constructor(private state: StateType) {}
  getState() {
    return this.state;
  }
  private setState(newState: Partial<StateType>) {
    this.state = { ...this.state, ...newState };
  }
  resetState() {
    this.state = {
      isConnected: false,
      rateLimit: 0,
      packetsProcessed: [],
      wordsProcessed: [],
      lastPacket: 0,
      totalCharacters: 0,
      totalWords: 0,
      lastWord: { number: 0, word: '' },
    };
  }
  logState() {
    // console.log(this.state.wordsProcessed.length, 'Words Processed');
  }
  async saveState() {
    await PacketChannelService.saveState(this.state);
  }
  async loadState() {
    const state = await PacketChannelService.getState();
    this.setState(state);
    this.logState();
  }
  async updateState(newState: Partial<StateType>) {
    this.setState(newState);
    await this.saveState();
    this.logState();
  }
  async addPacket(packet: Packet) {
    this.setState({
      packetsProcessed: [...this.state.packetsProcessed, packet.id],
      lastPacket: packet.id,
      totalCharacters: this.state.totalCharacters + packet.content.length,
    });
    await this.saveState();
    this.logState();
  }
  set isConnected(isConnected: boolean) {
    this.setState({ isConnected });
    this.logState();
  }
  get isConnected() {
    return this.state.isConnected;
  }
  set lastWord(lastWord: { number: number; word: string }) {
    this.setState({ lastWord });
    this.state.wordsProcessed.push(lastWord.word);
    this.state.totalWords++;
    this.logState();
  }
  get lastWord() {
    return this.state.lastWord;
  }
  get totalWords() {
    return this.state.totalWords;
  }
  get totalCharacters() {
    return this.state.totalCharacters;
  }
  get TotalPacketsProcessed() {
    return this.state.packetsProcessed.length;
  }
}

export const state = new State({
  isConnected: false,
  rateLimit: 0,
  packetsProcessed: [],
  wordsProcessed: [],
  lastPacket: 0,
  totalCharacters: 0,
  totalWords: 0,
  lastWord: { number: 0, word: '' },
});
