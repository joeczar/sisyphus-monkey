import type { WordNode } from '../types/wordNode';

export const metadataPrompt = (wordNode: WordNode) => {
  if (!wordNode.meanings) {
    throw new Error('No meaning found for word');
  }
  const input = `Please generate additional metadata for the word "${
    wordNode.word
  }" based on its definition: ${JSON.stringify(
    wordNode.meanings
  )}. The metadata will be used to create connections in a Neo4j "Poetry Building Knowledge Graph".

  Please provide the metadata as a JSON array containing 3 objects, each with the following properties:
  - type: A categorization of the metadata (e.g., "literary_use", "mythology", "sensory_association", "emotion", "abstract", "concrete")
  - associated_concepts: An array of related concepts or ideas
  - images: An array of visual associations or imagery
  - sounds: An array of auditory associations or descriptions
  - feelings: An array of emotional associations or evoked feelings
  - related_colors: An array of colors associated with the word (lowercase, underscore-separated)
  - related_natural_elements: An array of natural elements or phenomena associated with the word (lowercase, underscore-separated)
  
  Example metadata object:
  {
    "type": "sensory_association",
    "associated_concepts": ["nature", "growth", "freshness"],
    "images": ["green_leaves", "sprouting_seeds", "morning_dew"],
    "sounds": ["rustling_leaves", "chirping_birds", "gentle_breeze"],
    "feelings": ["rejuvenation", "vitality", "peacefulness"],
    "related_colors": ["green", "yellow", "pale_blue"],
    "related_natural_elements": ["plants", "sunlight", "water"]
  }
  
  Please ensure the metadata is relevant to the word and its definition. Be creative and imaginative in your associations and connections. Remember, this is for an artistic poetry knowledge graph!
  
  To optimize the data structure for Neo4j, please return the metadata as a JSON object with the following structure:
  {
    "metadata": [
      {
        "type": "...",
        "associated_concepts": [...],
        "images": [...],
        "sounds": [...],
        "feelings": [...],
        "related_colors": [...],
        "related_natural_elements": [...]
      },
      ...
    ]
  }
  
  PLEASE RETURN ONLY JSON! Thank you!`;
  return input;
};
