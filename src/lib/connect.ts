import * as http from 'http';
import { Socket, connect as netConnect, isIP } from 'net';
import * as url from 'url';
import { SocksClient, SocksProxy } from 'socks';
import { upstream } from './config';
import { shouldProxy } from './util';
import logger from './logger';

async function connectSocks(uri: url.URL): Promise<Socket> {
  const isUpstreamIp = isIP(upstream.host);

  const { socket } = await SocksClient.createConnection({
    proxy: {
      type: upstream.type,
      port: upstream.port,
      host: isUpstreamIp ? undefined : upstream.host,
      ipaddress: !isUpstreamIp ? undefined : upstream.host,
    } as SocksProxy,
    destination: {
      host: uri.hostname,
      port: parseInt(uri.port || '443', 10),
    },
    command: 'connect',
  });

  return socket;
}

function connectPassthrough(uri: url.URL): Socket {
  return netConnect(parseInt(uri.port || '443', 10), uri.hostname);
}

export async function connect(req: http.IncomingMessage, reqSocket: Socket, head: Buffer): Promise<void> {
  const uri = new url.URL(`http://${req.url}`);

  let s: Socket;
  try {
    const proxied = await shouldProxy(uri.hostname);

    logger.debug({ channel: 'connect', message: 'connect received', host: uri.hostname, proxied });

    if (proxied) {
      s = await connectSocks(uri);
    } else {
      s = connectPassthrough(uri);
    }
  } catch (e) {
    logger.error({ channel: 'connect', message: e.message, stack: e.stack });
    reqSocket.destroy(e);
    return;
  }

  reqSocket.on('error', (e) => {
    logger.error({ channel: 'connect', message: e.message, stack: e.stack });
    if (s) {
      s.destroy(e);
    }
  });

  s.on('error', (e) => {
    logger.error({ channel: 'connect', message: e.message, stack: e.stack });
    reqSocket.destroy(e);
  });

  s.pipe(reqSocket);
  reqSocket.pipe(s);

  s.write(head);
  reqSocket.write(`HTTP/${req.httpVersion} 200 Connection established\r\n\r\n`);
  s.resume();
}
