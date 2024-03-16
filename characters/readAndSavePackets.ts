import type { Packet } from './../characters/packet.type';
import fs from 'fs';
import path from 'path';
import { state } from '../state/stateManager';
import { packetService } from '../db/neo4j/PacketService';

const FOLDER_PATH = path.join(__dirname, '..', 'generated-letters-chunked');
const BATCH_LENGTH = 50;

export async function getAndParsePackets() {
  state.loadState();
  let files = await fs.promises.readdir(FOLDER_PATH);
  const numberOfFiles = files.length;
  console.log(`Found ${numberOfFiles} files`);
  if (!files) {
    throw new Error('No files found');
  }
  console.log('Sorting files...');
  console.log(
    files
      .map((file) => ({
        file,
        sortKey: parseInt(file.match(/\d+/g)?.join('') || '0', 10),
      }))
      .slice(0, 10)
  );
  files.sort((a, b) => {
    const matchA = a.match(/^(\d+)_sisyphos-chunk-(\d+)\.json$/);
    const matchB = b.match(/^(\d+)_sisyphos-chunk-(\d+)\.json$/);
    if (!matchA || !matchB) return 0; // or handle this case as an error

    const numA1 = parseInt(matchA[1], 10);
    const numA2 = parseInt(matchA[2], 10);
    const numB1 = parseInt(matchB[1], 10);
    const numB2 = parseInt(matchB[2], 10);

    if (numA1 !== numB1) {
      return numA1 - numB1;
    } else {
      return numA2 - numB2;
    }
  });

  let packetBatch: Packet[] = [];
  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    let file = files[fileIndex];
    const filePath = path.join(FOLDER_PATH, file);
    let fileContent = await fs.promises.readFile(filePath, 'utf-8');
    let packet: Packet = JSON.parse(fileContent);
    console.log(`Processing packet ${packet.id}...`);
    packetBatch.push(packet);
    // save to neo4j
    if (packetBatch.length === BATCH_LENGTH) {
      try {
        await packetService.savePacketBatch(packetBatch);
        packetBatch = [];
      } catch (error) {
        console.error('Error saving packet batch', error);
      }

      await new Promise((resolve) => setTimeout(resolve, 10000)); // 1 second pause
    }
  }
}
