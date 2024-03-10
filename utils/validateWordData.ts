import type { Metadata, WordData } from '../types/wordData';

export type ValidationResult = {
  good: WordData[];
  bad: Array<{
    wordData: WordData;
    errors: {
      base: string[];
      meaning: string[];
      metadata: string[];
    };
  }>;
};

export function validateWordData(wordDataList: WordData[]): ValidationResult {
  let result: ValidationResult = { good: [], bad: [] };

  wordDataList.forEach((wordData) => {
    let errors = {
      base: [] as string[],
      meaning: [] as string[],
      metadata: [] as string[],
    };

    // Base fields validation
    if (!wordData.word) errors.base.push('Missing word.');
    if (typeof wordData.packetNr !== 'number')
      errors.base.push('packetNr must be a number.');
    if (
      !wordData.position ||
      typeof wordData.position.start !== 'number' ||
      typeof wordData.position.end !== 'number'
    )
      errors.base.push('Invalid position.');
    if (typeof wordData.wordNr !== 'number')
      errors.base.push('wordNr must be a number.');
    if (typeof wordData.chars !== 'number')
      errors.base.push('chars must be a number.');

    // Meaning fields validation
    if (wordData.meaning) {
      if (!Array.isArray(wordData.meaning)) {
        errors.meaning.push('meaning must be an array.');
      } else {
        wordData.meaning.forEach((meaning, index) => {
          if (!meaning.partOfSpeech)
            errors.meaning.push(
              `Missing partOfSpeech in meaning at index ${index}.`
            );
          if (
            !Array.isArray(meaning.definitions) ||
            meaning.definitions.length === 0
          ) {
            errors.meaning.push(
              `Definitions must be a non-empty array in meaning at index ${index}.`
            );
          } else {
            meaning.definitions.forEach((definition, defIndex) => {
              if (!definition.definition)
                errors.meaning.push(
                  `Missing definition in definitions at index ${defIndex} in meaning ${index}.`
                );
            });
          }
        });
      }
    }
    function isStringArrayOrUndefined(
      value: any
    ): value is string[] | undefined {
      return (
        value === undefined ||
        (Array.isArray(value) &&
          value.every((item) => typeof item === 'string'))
      );
    }
    // Metadata validation
    if (wordData.metadata && !Array.isArray(wordData.metadata)) {
      errors.metadata.push('metadata must be an array.');
    } else if (wordData.metadata) {
      wordData.metadata.forEach((md, index) => {
        if (!md.type) {
          errors.metadata.push(`Missing type in metadata at index ${index}.`);
        }

        const arrayFields: (keyof Metadata)[] = [
          'associatedConcepts',
          'images',
          'sounds',
          'feelings',
          'relatedColors',
          'relatedNaturalElements',
        ];

        arrayFields.forEach((field) => {
          const mdField = md[field];

          // Check if mdField is an array of strings or undefined
          if (!isStringArrayOrUndefined(mdField)) {
            errors.metadata.push(
              `${field} in metadata at index ${index} is not an array of strings or is undefined.`
            );
          }
        });
      });
    }

    // Categorize wordData based on validation
    if (
      errors.base.length > 0 ||
      errors.meaning.length > 0 ||
      errors.metadata.length > 0
    ) {
      result.bad.push({
        wordData,
        errors,
      });
    } else {
      result.good.push(wordData);
    }
  });

  return result;
}
