import { Ollama } from '@langchain/community/llms/ollama';
import { PromptTemplate } from '@langchain/core/prompts';
import type { WordData } from '../types/wordData';
import type { WordDefinition } from '../words/getDefinitions';

const llm = new Ollama({
  model: 'mistral',
  baseUrl: 'http://localhost:11434',
});

export const getWordPrompt = (
  wordData: WordData,
  definition: WordDefinition
) => {
  const promptTemplate = PromptTemplate.fromTemplate(
    `Prepare a structured JSON object containing comprehensive metadata for the word specified in 'wordData.word'. The output should include various details essential for integrating into a poetry knowledge graph within a Neo4j database. Ensure the JSON object comprises the following fields:

    - 'word': The word being described.
    - 'origin': The etymology or origin of the word.
    - 'meanings': A list of meanings or definitions of the word, provided as a structured array.
    - 'phonetics': Phonetic representation(s) of the word.
    - 'synonyms': A list of words with similar meanings.
    - 'antonyms': A list of words with opposite meanings.
    - 'relatedConcepts': Dynamically generated related concepts or themes associated with the word, aimed at linking to other words within the knowledge graph.
    - 'packetNr': An identifier for the packet number, aiding in dataset organization.
    - 'position': The start and end positions of the word in the dataset, provided as an object.
    - 'wordNr': The sequence number of the word in the dataset.
    - 'chars': The number of characters in the word.
    
    Please dynamically generate the 'relatedConcepts' based on the word's meanings, synonyms, and antonyms, ensuring they are relevant for poetic connections. Below are the current data points provided for 'wordData' and 'definition' for your reference:
    Ensure the JSON object is correctly formatted and complete, ready for insertion into the knowledge graph.
    ```json
    "wordData": ${JSON.stringify(wordData, null, 2)},
    "definition": ${JSON.stringify(definition, null, 2)}
    ```
`
  );
  return promptTemplate.pipe(llm);
};

// export const wordChain = promptTemplate.pipe(llm);

// const response = await chain.invoke({
//   wordObject: wordData,
// });

// console.log(response);
