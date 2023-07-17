import * as http from 'http';
import * as https from 'https';
import * as url from 'url';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { DIRECT_PROXY_MODE, getProxy } from './util';
import logger from './logger';

function _request(uri: url.URL, req: http.IncomingMessage, res: http.ServerResponse, agent?: http.Agent | null): void {
  const httpModule = uri.protocol === 'https:' ? https : http;
  const proxy = httpModule.request({
    port: uri.port,
    hostname: uri.hostname,
    path: uri.pathname + uri.search,
    method: req.method,
    headers: req.headers,
    agent,
  });

  req.on('error', (e) => {
    logger.error({
      channel: 'request',
      message: e.message,
      hostname: uri.hostname,
      port: uri.port,
      protocol: uri.protocol,
      stack: e.stack,
    });
    proxy.destroy(e);
  });

  proxy.on('error', (e) => {
    logger.error({
      channel: 'request',
      message: e.message,
      hostname: uri.hostname,
      port: uri.port,
      protocol: uri.protocol,
      stack: e.stack,
    });
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

  try {
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
        return _request(uri, req, res, new SocksProxyAgent(`socks${proxy.type}://${proxy.host}:${proxy.port}`));
      } else {
        return _request(uri, req, res);
      }
    } catch (e) {
      logger.error({
        channel: 'request',
        message: (e as Error).message,
        host: uri.hostname,
        proxy: proxy !== DIRECT_PROXY_MODE ? `${proxy.host}:${proxy.port}` : '',
        stack: (e as Error).stack,
      });
      try {
        res.writeHead(500);
        res.end('Connection error\n');
      } catch {
        // empty
      }
    }
  } catch (e) {
    logger.error({ channel: 'request', message: (e as Error).message, host: uri.hostname, stack: (e as Error).stack });
  }
}
