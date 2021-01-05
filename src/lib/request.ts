import * as http from 'http';
import * as url from 'url';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { DIRECT_PROXY_MODE, getProxy } from './util';
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
  const proxy = await getProxy(`http://${uri.hostname}`, uri.hostname.split(':')[0]);

  logger.debug({
    channel: 'request',
    message: 'request received',
    host: uri.hostname,
    proxy: proxy !== DIRECT_PROXY_MODE ? `${proxy.host}:${proxy.port}` : '',
  });

  try {
    // conditionally forward through socks proxy
    if (proxy !== DIRECT_PROXY_MODE) {
      return _request(uri, req, res, new SocksProxyAgent(proxy));
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
