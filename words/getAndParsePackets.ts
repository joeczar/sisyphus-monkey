import type { Packet } from './../characters/packet.type';
import fs from 'fs';
import path from 'path';
import { processPackets, processBoundaryWords } from './processPackets';
import { PacketChannelService } from './RedisWordService';

const FOLDER_PATH = path.join(__dirname, '..', 'generated-letters-chunked');
const GOAL_PATH = path.join(__dirname, '..', 'wordPackets');

export async function getAndParsePackets() {
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

  let previousPacket = null;
  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    let file = files[fileIndex];
    const filePath = path.join(FOLDER_PATH, file);
    let fileContent = await fs.promises.readFile(filePath, 'utf-8');
    let packet = JSON.parse(fileContent);
    // console.log(`Processing packet ${packet.id}...`);
    const packetWords = await processPackets(packet);
    console.log(
      `Processed packet ${packet.id} with ${packetWords.length} words`
    );

    // // Check for boundary words if there was a previous packet
    // if (previousPacket) {
    //   const boundaryWord = processBoundaryWords(previousPacket, packet);
    //   if (boundaryWord) {
    //     // Add the found boundary word to the word list of the previous packet
    //     packetWords.unshift(boundaryWord);
    //   }
  }

  // // Save the processed packet words to a file in the GOAL_PATH
  // const outputFile = path.join(GOAL_PATH, `wordPacket_${packet.id}.json`);
  // await fs.promises.writeFile(
  //   outputFile,
  //   JSON.stringify(packetWords, null, 2),
  //   'utf-8'
  // );

  // previousPacket = packet; // Update previousPacket for the next iteration boundary word check
}
// }
