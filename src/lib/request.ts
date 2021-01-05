import * as http from 'http';
import * as url from 'url';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { upstream } from './config';
import { shouldProxy } from './util';
import logger from './logger';

function _request(uri: url.URL, req: http.IncomingMessage, res: http.ServerResponse, agent?: http.Agent | null): void {
  const proxy = http.request({
    port: uri.port,
    hostname: uri.hostname,
    path: uri.pathname + uri.search,
    method: req.method,
    headers: req.headers,
    agent,
  });

  req.on('error', (e) => {
    logger.error({ channel: 'request', message: e.message, stack: e.stack });
    proxy.destroy(e);
  });

  proxy.on('error', (e) => {
    logger.error({ channel: 'request', message: e.message, stack: e.stack });
    res.writeHead(500);
    res.end('Connection error\n');
  });

  proxy.on('response', (proxyRes) => {
    proxyRes.pipe(res);
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
  });

  req.pipe(proxy);
}

export async function request(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const uri = new url.URL(req.url);
  const proxied = await shouldProxy(uri.hostname);

  logger.debug({ channel: 'request', message: 'request received', host: uri.hostname, proxied });

  try {
    // conditionally forward through socks proxy
    if (proxied) {
      return _request(uri, req, res, new SocksProxyAgent(upstream));
    } else {
      return _request(uri, req, res);
    }
  } catch (e) {
    logger.error({ channel: 'request', message: e.message, stack: e.stack });
    try {
      res.writeHead(500);
      res.end('Connection error\n');
    } catch {
      // empty
    }
  }
}
