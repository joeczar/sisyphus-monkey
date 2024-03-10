import { PacketChannelService } from '../words/RedisWordService';
import path from 'path';
import fs from 'fs';

const testPrint = async () => {
  await PacketChannelService.initRedis();
  const words = ['ps', 'k', 'o', 'u', 'i', 'he'];
  const wordArray = [];
  for (let word of words) {
    const wordData = await PacketChannelService.getWord(word);
    wordArray.push(wordData);
  }
  // print the word data to file
  const outputFile = path.join(__dirname, `testWords.json`);
  await fs.promises.writeFile(
    outputFile,
    JSON.stringify(wordArray, null, 2),
    'utf-8'
  );
};

await testPrint();
