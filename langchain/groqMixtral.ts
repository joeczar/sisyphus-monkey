import { OpenAI } from 'langchain/llms/openai';
import { createClient } from 'redis';
import type { Meaning, WordDefinition } from '../types/wordData';
import { ChatGroq } from '@langchain/groq';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { WordData } from '../types/wordData';
import { PacketChannelService } from '../words/RedisWordService';
import type { BaseMessageChunk } from 'langchain/schema';

export async function fetchMeaning(word: string) {
  if (!word) {
    throw new Error('No word provided');
  }
  // Check if the definition exists in Redis cache
  const cachedDefinition = await PacketChannelService.getWord(word);
  if (cachedDefinition) {
    return JSON.parse(cachedDefinition);
  }

  // If not in cache, fetch the definition from the dictionary API
  // const response = await fetch(
  //   `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
  // );
  // const data = (await response.json()) as WordDefinition;
  // const meaning = data.meanings[0];
  const fetchDataWithTimeout = (url: string, options = {}, timeout = 10000) => {
    return Promise.race([
      fetch(url, options),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      ),
    ]);
  };

  try {
    const response = (await fetchDataWithTimeout(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`,
      {
        method: 'GET',
      }
    )) as unknown as Response;

    if (!response.ok) {
      throw new Error(
        `Failed to fetch data: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as WordDefinition[];
    const meaning = data[0].meanings[0];
    // Store the definition in Redis cache for future lookups
    await PacketChannelService.setWord(word, JSON.stringify(meaning));

    return meaning;
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

export async function addMeaning(wordData: WordData): Promise<WordData> {
  const meaning = await fetchMeaning(wordData.word);

  const wordObject: WordData = {
    ...wordData,
    meaning,
  };

  return wordObject;
}

async function groqPrompt(wordObject: WordData) {
  const model = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    modelName: 'mixtral-8x7b-32768',
    temperature: 1.1,
  });

  const input = `Please generate additional metadata for the word "${
    wordObject.word
  }" based on its definition: ${JSON.stringify(
    wordObject.meaning
  )}. The metadata will be used to create connections in neo4j where we are building a "Poetry building knowledge graph". Your data constraints are to return an array of whatever you think could be useful for this purpose. Be creative! This is art! What images does the word evoke? What sounds? What feelings? Just remember, these are nodes in a neo4j graph database. Please create nodes other words can connect to to create the poem.
  - The metadata should be relevant to the word and its definition.
  - The metadata should be in a structured format and should be relevant to the word and its definition.
  - PLEASE RETURN ONLY JSON!

  Thank you!`;

  const prompt = ChatPromptTemplate.fromMessages(['human', '{input}']);
  const chain = prompt.pipe(model);
  const response = await chain.invoke({
    input,
  });

  return {
    response,
    wordObject,
    chain,
  };
}
export async function generateMetadata(wordObject: WordData) {
  try {
    const { response } = await groqPrompt(wordObject);
    if (!response) {
      throw new Error('No response from Groq');
    }
    const metadata = JSON.parse(response.lc_kwargs.content);
    console.log('response', {
      response,
      metadata,
    });
    return metadata;
  } catch (error) {
    console.error('Error generating metadata:', error);
  }
}
export async function addMetadata(wordData: WordData): Promise<WordData> {
  const metadata = await generateMetadata(wordData);
  if (metadata) {
    if (metadata && Array.isArray(metadata)) {
      wordData.metadata = metadata;
    }
  }
  return wordData;
}
// metadata: [
//   {
//     type: "greek_letter",
//     associated_concepts: [ "alephbet", "symbols", "mathematics", "astronomy" ],
//     images: [ "ancient_text", "starry_sky", "geometric_shape" ],
//     sounds: [ "rounded", "flowing", "soft" ],
//     feelings: [ "mystery", "wisdom", "antiquity" ],
//     related_colors: [ "deep_blue", "gold", "ivory" ],
//     related_natural_elements: [ "ocean", "stars", "precious_stones" ],
//   }, {
//     type: "literary_use",
//     associated_concepts: [ "poetry", "wordplay", "typography" ],
//     images: [ "calligraphy", "old_books", "quills" ],
//     sounds: [ "whispered", "contemplative", "rhythmic" ],
//     feelings: [ "contemplation", "meditation", "insight" ],
//     related_colors: [ "brown", "mustard", "burgundy" ],
//     related_natural_elements: [ "parchment", "ink", "wax_seals" ],
//   }, {
//     type: "mythology",
//     associated_concepts: [ "Greek_mythology", "Omega_cult", "end_of_things" ],
//     images: [ "temple", "mystic_rituals", "mysterious_figures" ],
//     sounds: [ "chanting", "incense_burning", "silence" ],
//     feelings: [ "transcendence", "enlightenment", "completion" ],
//     related_colors: [ "purple", "silver", "black" ],
//     related_natural_elements: [ "smoke", "moon", "crystal_balls" ],
//   }
// ],
// }
// metadata: [
//   {
//     name: "letter",
//     definition: "The character that represents a speech sound",
//     type: "node",
//     propertiesToIndex: [ "name", "definition" ],
//   }, {
//     name: "Latin-script",
//     definition: "A writing system in which the letters generally represent sounds in the spoken language",
//     type: "node",
//     propertiesToIndex: [ "name", "definition" ],
//   }, {
//     name: "zero",
//     definition: "A digit that represents the absence of quantity",
//     type: "node",
//     propertiesToIndex: [ "name", "definition" ],
//   }, {
//     name: "numeral",
//     definition: "A symbol used in counting or in calculations",
//     type: "node",
//     propertiesToIndex: [ "name", "definition" ],
//   }, {
//     name: "circle",
//     definition: "A shape with all points the same distance from the center",
//     type: "node",
//     propertiesToIndex: [ "name", "definition" ],
//   }, {
//     name: "round",
//     definition: "Having a curved shape",
//     type: "node",
//     propertiesToIndex: [ "name", "definition" ],
//   }, {
//     name: "open",
//     definition: "Not closed; having no barrier",
//     type: "node",
//     propertiesToIndex: [ "name", "definition" ],
//   }, {
//     name: "beginning",
//     definition: "The first part of something",
//     type: "node",
//     propertiesToIndex: [ "name", "definition" ],
//   }, {
//     name: "center",
//     definition: "A point equidistant from all points of a circle",
//     type: "node",
//     propertiesToIndex: [ "name", "definition" ],
//   }, {
//     name: "vowel",
//     definition: "A speech sound made by partially or completely stopping the flow of air",
//     type: "node",
//     propertiesToIndex: [ "name", "definition" ],
//   }
// ],
