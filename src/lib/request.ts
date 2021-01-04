import * as http from 'http';
import * as url from 'url';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { upstream } from './config';
import { shouldProxy } from './util';

function _request(uri: url.URL, req: http.IncomingMessage, res: http.ServerResponse, agent?: http.Agent | null): void {
  const proxy = http.request({
    port: uri.port,
    hostname: uri.hostname,
    path: uri.pathname + uri.search,
    method: req.method,
    headers: req.headers,
    agent,
  });

  req.on('error', (err) => {
    proxy.destroy(err);
  });

  proxy.on('error', (_err) => {
    res.writeHead(500);
    res.end('Connection error\n');
  });

  proxy.on('response', (proxyRes) => {
    proxyRes.pipe(res);
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
  });

  req.pipe(proxy);
}

export function request(req: http.IncomingMessage, res: http.ServerResponse): void {
  const uri = new url.URL(req.url);

  // conditionally forward through socks proxy
  if (shouldProxy(uri.hostname)) {
    return _request(uri, req, res, new SocksProxyAgent(upstream));
  } else {
    return _request(uri, req, res);
  }
}
