import { createClient } from 'redis';
import { redisConfig } from './redisConfig';

let isConnected = false;

const client = createClient({
  url: `${redisConfig.host}`,
  password: redisConfig.password,
});

client.on('connect', () => {
  isConnected = true;
  console.log('Redis connection established.');
});

client.on('error', (error) => {
  isConnected = false;
  console.error('Error connecting to Redis:', error);
});

(async () => {
  try {
    if (!isConnected) {
      console.log('Preparing to connect to Redis...', { isConnected });
      await client.connect();
      console.log('Successfully connected to Redis.');
    }
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    process.exit(1);
  }
})();

export const redisClient = client;
