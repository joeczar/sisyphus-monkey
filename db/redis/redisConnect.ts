import { redisConfig, type RedisConfig } from './redisConfig';
import RedisClient, { type Redis } from 'ioredis';

export const redisConnect = (redisConfig: RedisConfig) => {
  const redisClient = new RedisClient(redisConfig);

  console.log('Redis client created.');

  redisClient.on('connect', () => {
    console.log('Redis connection established.');
  });

  redisClient.on('error', (error) => {
    console.error('Error connecting to Redis:', error);
    throw error;
  });

  redisClient.on('close', () => {
    console.log('Connection to Redis closed.');
  });

  console.log('Redis client initialized.');

  return redisClient;
};

export const redisClient = redisConnect(redisConfig);
