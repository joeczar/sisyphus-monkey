import type { Packet } from './../characters/packet.type';
import fs from 'fs';
import path from 'path';
import { state } from '../state/stateManager';
import { packetService } from '../db/neo4j/PacketService';

const FOLDER_PATH = path.join(__dirname, '..', 'generated-letters-chunked');
const BATCH_LENGTH = 50

export async function getAndParsePackets() {
  state.loadState();
  let files = await fs.promises.readdir(FOLDER_PATH);
  const numberOfFiles = files.length;
  console.log(`Found ${numberOfFiles} files`);
  if (!files) {
    throw new Error('No files found');
  }
  console.log('Sorting files...');
  files.sort((a, b) => {
    const numA = parseInt(a.match(/\d+/g)?.join('') || '0', 10);
    const numB = parseInt(b.match(/\d+/g)?.join('') || '0', 10);
    return numA - numB;
  });

  let packetBatch: Packet[] = []
  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    let file = files[fileIndex];
    const filePath = path.join(FOLDER_PATH, file);
    let fileContent = await fs.promises.readFile(filePath, 'utf-8');
    let packet: Packet = JSON.parse(fileContent);
    console.log(`Processing packet ${packet.id}...`);
    // save to neo4j
    if (packetBatch.length === BATCH_LENGTH) {
      await packetService.savePacketBatch(packetBatch)
      packetBatch = []
    }
  } 
}
