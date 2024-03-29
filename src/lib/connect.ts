import type * as http from 'http';
import type { Socket } from 'net';
import { connect as netConnect, isIP } from 'net';
import * as url from 'url';
import type { SocksProxy } from 'socks';
import { SocksClient } from 'socks';
import { DIRECT_PROXY_MODE, getProxy } from './util';
import logger from './logger';
import { socksConnectTimeout } from './config';

async function connectSocks(upstream: SocksProxy, uri: url.URL): Promise<Socket> {
  const isUpstreamIp = isIP(upstream.host);

  try {
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
      timeout: socksConnectTimeout,
    });

    return socket;
  } catch (e) {
    logger.error({ channel: 'connect', message: (e as Error).message, host: uri.hostname, stack: (e as Error).stack });
  }
  return null;
}

function connectPassthrough(uri: url.URL): Socket {
  return netConnect(parseInt(uri.port || '443', 10), uri.hostname);
}

export async function connect(req: http.IncomingMessage, reqSocket: Socket, head: Buffer): Promise<void> {
  const uri = new url.URL(`http://${req.url}`);

  let s: Socket;
  try {
    const proxy = await getProxy(`https://${uri.hostname}`, uri.hostname.split(':')[0]);

    logger.debug({
      channel: 'connect',
      message: 'connect received',
      host: uri.hostname,
      proxy: proxy !== DIRECT_PROXY_MODE ? `${proxy.host}:${proxy.port}` : '',
    });

    try {
      if (proxy !== DIRECT_PROXY_MODE) {
        s = await connectSocks(proxy, uri);
      } else {
        s = connectPassthrough(uri);
      }
    } catch (e) {
      logger.error({
        channel: 'connect',
        message: (e as Error).message,
        host: uri.hostname,
        stack: (e as Error).stack,
      });
    }
    if (!s) {
      try {
        reqSocket.end();
      } catch {
        // empty
      }
      return;
    }

    reqSocket.on('error', (e) => {
      logger.error({
        channel: 'connect',
        message: e.message,
        host: uri.hostname,
        proxy: proxy !== DIRECT_PROXY_MODE ? `${proxy.host}:${proxy.port}` : '',
        stack: e.stack,
      });
      if (s) {
        s.destroy(e);
      }
    });

    s.on('error', (e) => {
      logger.error({
        channel: 'connect',
        message: e.message,
        host: uri.hostname,
        proxy: proxy !== DIRECT_PROXY_MODE ? `${proxy.host}:${proxy.port}` : '',
        stack: e.stack,
      });
      reqSocket.destroy(e);
    });

    s.pipe(reqSocket);
    reqSocket.pipe(s);

    s.write(head);
    reqSocket.write(`HTTP/${req.httpVersion} 200 Connection established\r\n\r\n`);
    s.resume();
  } catch (e) {
    logger.error({ channel: 'connect', message: (e as Error).message, host: uri.hostname, stack: (e as Error).stack });

    try {
      reqSocket.destroy(e as Error);
    } catch {
      // empty
    }
  }
}
