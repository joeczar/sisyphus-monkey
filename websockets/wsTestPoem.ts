import WebSocketClient from './WebSocketClient';

const poemsClient = new WebSocketClient(
  'ws://word.local:8080?clientId=poems',
  'poems'
);

poemsClient.connect();

export default poemsClient;
