import { initializeWsClient } from '../websockets/client';

let isActive = false;

const wsClient = await initializeWsClient();

wsClient.client?.on('message', (message: string) => {
  console.log('Message Recieved', message);
  if (message === 'start') {
    isActive = true;
    console.log('isActive', isActive);
  }
});
