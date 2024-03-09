import { OpenAI } from 'langchain/llms/openai';
import { createClient } from 'redis';
import type { Meaning, WordDefinition } from '../types/wordData';
import { ChatGroq } from '@langchain/groq';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { WordData } from '../types/wordData';
import { metadataPrompt } from './metadataPrompt';

async function groqPrompt(wordObject: WordData) {
  const model = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    modelName: 'mixtral-8x7b-32768',
    temperature: 1.1,
  });

  const input = metadataPrompt(wordObject);

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
    console.log('generateMetadata Response:', response);
    if (!response) {
      throw new Error('No response from Groq');
    }
    if (
      typeof response.content === 'string' &&
      response.content.includes('"metadata":')
    ) {
      const { metadata } = JSON.parse(response.content);
      return metadata;
    }
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
