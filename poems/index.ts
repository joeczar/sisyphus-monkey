/**
 * 1. get definitions for all words
 */

import { Redis } from 'ioredis';
import { redisClientManager } from '../db/redis/RedisClient';
import { handleDefinitions } from './definitions';

const initializePoems = async () => {
  console.log('Initializing poems');
  redisClientManager.connect();
  await handleDefinitions();
  // console.log('Poems initialized');
};

initializePoems().catch(console.error);
