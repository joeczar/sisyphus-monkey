import WebSocketClient from './WebSocketClient';

const charClient = new WebSocketClient(
  'ws://word.local:8080?clientId=character',
  'character'
);

charClient.connect();

export default charClient;
