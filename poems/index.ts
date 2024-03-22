/**
 * 1. get definitions for all words
 */

import { Redis } from 'ioredis';
import { redisClientManager } from '../db/redis/RedisClient';
import { handleDefinitions } from './definitions';
import { definitionState } from '../state/DefinitionState';

const initializePoems = async () => {
  console.log('Initializing poems');
  redisClientManager.connect();
  definitionState.clearState();
  definitionState.setIsReady(true);
  const apiResponse = await fetch(
    'https://api.dictionaryapi.dev/api/v2/entries/en_US/hello'
  );
  if (!apiResponse.ok) {
    console.error('Failed to fetch definitions:', apiResponse.statusText);
    return;
  }
  await handleDefinitions();
  // console.log('Poems initialized');
};

initializePoems().catch(console.error);
