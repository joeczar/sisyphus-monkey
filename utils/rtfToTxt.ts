import fs from 'fs';
import { $ } from 'bun';

const folderPath = '../sysyphos_original';
const toPath = '../generated-letters';
const files = fs.readdirSync(folderPath);

for (const file of files) {
  if (file.endsWith('.rtf')) {
    console.log(file);
    const nameArr = file.split(' ');
    const nameEnd = nameArr.pop();
    const number = nameEnd?.split('.')[0];
    const fileName = nameEnd?.split('.')[1];
    const newName = `${number}_${nameArr[0].toLowerCase()}.txt`;
    console.log(`Converting ${file} to ${newName}`);
    await $`textutil -convert txt ${folderPath}/${file} -output ${toPath}/${newName}`;
  }
}
