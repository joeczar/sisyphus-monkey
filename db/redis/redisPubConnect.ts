import { createClient } from 'redis';
import { redisConfig } from './redisConfig';

let isConnected = false;

const client = createClient({
  url: `${redisConfig.host}`,
  password: redisConfig.password,
});

client.on('connect', () => {
  isConnected = true;
  console.log('RedisPub connection established.');
});

client.on('error', (error) => {
  isConnected = false;
  console.error('Error connecting to RedisPub:', error);
});

(async () => {
  try {
    if (!isConnected) {
      console.log('Preparing to connect to RedisPub...', { isConnected });
      await client.connect();
      console.log('Successfully connected to RedisPub.');
    }
  } catch (error) {
    console.error('Failed to connect to RedisPub:', error);
    process.exit(1);
  }
})();

export const redisPubClient = client;
