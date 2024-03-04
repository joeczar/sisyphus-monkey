import { createClient } from 'redis';

export async function publishMessage() {
  const client = createClient({
    url: process.env.REDIS_URL,
  });
  await client.connect();

  const channel = 'messages';
  const message = 'Hello, Redis!';

  await client.publish(channel, message);
  console.log(`Message published to channel "${channel}"`);

  await client.disconnect();
}

publishMessage().catch(console.error);

export async function subscribeToChannel() {
  const client = createClient({
    url: process.env.REDIS_URL,
  });
  await client.connect();

  const channel = 'messages';

  await client.subscribe(channel, (message) => {
    console.log(`Received message: ${message}`);
  });

  console.log(`Subscribed to channel "${channel}"`);
}

subscribeToChannel().catch(console.error);
