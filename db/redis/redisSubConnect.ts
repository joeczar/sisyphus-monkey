import { createClient } from 'redis';
import { redisConfig } from './redisConfig';

let isConnected = false;

const client = createClient({
  url: `${redisConfig.host}`,
  password: redisConfig.password,
});

client.on('connect', () => {
  isConnected = true;
  console.log('RedisSub connection established.');
});

client.on('error', (error) => {
  isConnected = false;
  console.error('Error connecting to RedisSub:', error);
});

(async () => {
  try {
    if (!isConnected) {
      console.log('Preparing to connect to RedisSub...', { isConnected });
      await client.connect();
      console.log('Successfully connected to RedisSub.');
    }
  } catch (error) {
    console.error('Failed to connect to RedisSub:', error);
    process.exit(1);
  }
})();

export const redisSubClient = client;
