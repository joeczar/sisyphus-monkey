// File: readAndWrite.js

import fs from 'fs';

// Read from text file
const readFile = (filePath: string) => {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return data.split('\n').map((line: string) => line.trim());
  } catch (error) {
    console.error('Error reading file:', error);
    return [];
  }
};

//Create new javascript file and write to it
const writeToSet = (data: string[]) => {
  const uniqueSet = new Set(data);
  return uniqueSet;
};

// Create new javascript file and write to it
const writeToFile = (filePath: string, data: Set<string>) => {
  try {
    // create the file if it doesn't exist
    fs.writeFileSync(filePath, '');
    // name the export and define the New Set
    const exportName = 'export const wordsSet = new Set([';
    // write the export name to the file
    fs.appendFileSync(filePath, exportName);
    // write the data to the file and add quotes and commas
    data.forEach((word: string) => {
      fs.appendFileSync(filePath, `'${word}',\n`);
    });
    // close the export statement
    fs.appendFileSync(filePath, ']);');
  } catch (error) {
    console.error('Error writing to file:', error);
  }
};

// Usage
const filePath = './english-words/words_alpha.txt';
const data = readFile(filePath);
const uniqueSet = writeToSet(data);
writeToFile('./english-words/wordsSet.js', uniqueSet);

console.log(uniqueSet);
