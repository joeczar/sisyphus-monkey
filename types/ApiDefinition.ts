export type ApiDefinition = {
  definition: string;
  synonyms: string[];
  antonyms: string[];
  example?: string; // Optional
};

export type ApiMeaning = {
  partOfSpeech: string;
  definitions: ApiDefinition[];
  synonyms: string[];
  antonyms: string[];
};
export type ApiPhonetic = {
  text: string;
  audio?: string;
};

export type ApiWordDefinition = {
  word: string;
  phonetic: string;
  phonetics: ApiPhonetic[];
  origin: string;
  meanings: ApiMeaning[];
};

export type FlattenedWordDefinition = {
  word: string;
  partOfSpeech: string;
  definition: string;
  synonyms: string[];
  antonyms: string[];
  example?: string;
  phonetics: string;
  origin: string;
};

// [
//   {
//     word: 'i',
//     phonetics: [
//       {
//         audio:
//           'https://api.dictionaryapi.dev/media/pronunciations/en/i-1-us.mp3',
//         sourceUrl: 'https://commons.wikimedia.org/w/index.php?curid=1149882',
//       },
//     ],
//     meanings: [
//       {
//         partOfSpeech: 'noun',
//         definitions: [
//           {
//             definition: 'The name of the Latin-script letter I.',
//             synonyms: [],
//             antonyms: [],
//             example: 'the position of an i-dot (the dot of an i)',
//           },
//         ],
//         synonyms: [],
//         antonyms: [],
//       },
//     ],
//     license: {
//       name: 'CC BY-SA 3.0',
//       url: 'https://creativecommons.org/licenses/by-sa/3.0',
//     },
//     sourceUrls: ['https://en.wiktionary.org/wiki/i'],
//   },
//   {
//     word: 'i',
//     phonetic: '/aɪ/',
//     phonetics: [{ text: '/aɪ/', audio: '' }],
//     meanings: [
//       {
//         partOfSpeech: 'pronoun',
//         definitions: [
//           {
//             definition:
//               'The speaker or writer, referred to as the grammatical subject, of a sentence.',
//             synonyms: [],
//             antonyms: [],
//           },
//           {
//             definition:
//               'The speaker or writer, referred to as the grammatical object, of a sentence.',
//             synonyms: [],
//             antonyms: [],
//             example: 'Mom drove my sister and I to school.',
//           },
//         ],
//         synonyms: ['ch', 'ich', "m'ass", 'my ass', 'muggins', 'yours truly'],
//         antonyms: [],
//       },
//     ],
//     license: {
//       name: 'CC BY-SA 3.0',
//       url: 'https://creativecommons.org/licenses/by-sa/3.0',
//     },
//     sourceUrls: [
//       'https://en.wiktionary.org/wiki/I',
//       'https://en.wiktionary.org/wiki/i',
//     ],
//   },
// ];
