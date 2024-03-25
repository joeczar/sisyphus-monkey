import type { Packet } from './../characters/packet.type';
import fs from 'fs';
import path from 'path';
import { state } from '../state/stateManager';
import { packetService } from '../db/neo4j/PacketService';
import { charsState } from '../state/CharsState';

const FOLDER_PATH = path.join(__dirname, '..', 'generated-letters-chunked');
const BATCH_LENGTH = 10;

export async function getAndSortFiles() {
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
  return files.sort((a, b) => sortFilesByTitleNumbers(a, b));
}

export async function fetchAndSavePacket(fileName: string) {
  try {
    const filePath = path.join(FOLDER_PATH, fileName);
    let fileContent = await fs.promises.readFile(filePath, 'utf-8');
    let packet: Packet = JSON.parse(fileContent);
    console.log(`Processing packet ${packet.id}...`);

    const result = await packetService.savePacket(packet);

    charsState.addToTotalPackets(1);
    return result;
  } catch (error) {
    console.error('Error saving packet batch', error);
  }
}

const sortFilesByTitleNumbers = (a: string, b: string) => {
  const matchA = a.match(/^(\d+)_(sisyphos|sisyphus)-chunk-(\d+)\.json$/);
  const matchB = b.match(/^(\d+)_(sisyphos|sisyphus)-chunk-(\d+)\.json$/);
  if (!matchA || !matchB) return 0; // or handle this case as an error

  const numA1 = parseInt(matchA[1], 10);
  const numA2 = parseInt(matchA[3], 10); // Changed to index 3 to match the third capture group
  const numB1 = parseInt(matchB[1], 10);
  const numB2 = parseInt(matchB[3], 10); // Changed to index 3 to match the third capture group

  if (numA1 !== numB1) {
    return numA1 - numB1;
  } else {
    return numA2 - numB2;
  }
};
