import { Ollama } from '@langchain/community/llms/ollama';

export function ollamaChat(text: string): Promise<string[]> {
  const ollama = new Ollama({
    baseUrl: 'http://localhost:11434', // Default value
    model: 'llama2', // Default value
  });

  return new Promise<string[]>(async (resolve, reject) => {
    const stream = await ollama.stream(text);
    const chunks = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    resolve(chunks);
  });
}
