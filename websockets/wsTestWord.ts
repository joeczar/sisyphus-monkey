import { WsServer } from './WebsocketServer';

const server = new WsServer(8080);

server.start()

export default server
