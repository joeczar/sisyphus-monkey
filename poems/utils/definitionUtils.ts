import type {
  ApiWordDefinition,
  FlattenedWordDefinition,
} from '../../types/ApiDefinition';

export function flattenWordDefinitions(
  apiWordDefinitions: ApiWordDefinition[]
): FlattenedWordDefinition[] {
  return apiWordDefinitions
    .map((wordDef) => {
      // Flatten meanings and definitions
      const flattenedMeanings = wordDef.meanings.flatMap((meaning) => {
        // Combine synonyms and antonyms from the meaning level
        const combinedSynonyms = [...meaning.synonyms];
        const combinedAntonyms = [...meaning.antonyms];

        return meaning.definitions.map((def) => ({
          word: wordDef.word,
          partOfSpeech: meaning.partOfSpeech,
          definition: def.definition,
          synonyms: [...combinedSynonyms, ...def.synonyms],
          antonyms: [...combinedAntonyms, ...def.antonyms],
          example: def.example,
          phonetics: wordDef.phonetics
            .map((phonetic) => phonetic.text)
            .join(', '), // Join all phonetic texts
          origin: wordDef.origin,
        }));
      });

      return flattenedMeanings;
    })
    .flat(); // Flatten the array of arrays
}

export const flattenedWordDefinitionInsertQuery = `
// Parameters are passed into the query with the flattened structure
UNWIND $flattenedDefinitions AS def
MERGE (w:Word {word: def.word})
ON CREATE SET w.phonetics = def.phonetics, w.origin = def.origin
MERGE (p:PartOfSpeech {name: def.partOfSpeech})
MERGE (d:Definition {
  definition: def.definition,
  example: def.example
})
ON CREATE SET d.synonyms = def.synonyms, d.antonyms = def.antonyms
MERGE (w)-[:HAS_MEANING]->(m:Meaning)-[:PART_OF_SPEECH]->(p)
MERGE (m)-[:HAS_DEFINITION]->(d)
`;
