import { createPacResolver } from 'pac-resolver';
import type { FindProxyForURL } from 'pac-resolver';
import { getQuickJS } from '@tootallnate/quickjs-emscripten';
import { proxyDomains, pacFile, upstream } from './config';

export const DIRECT_PROXY_MODE = Symbol('DIRECT');
interface SocksProxyConfig {
  type: 4 | 5;
  host: string;
  port: number;
}

let findProxyForURLPromise: Promise<FindProxyForURL>;
if (pacFile) {
  findProxyForURLPromise = Promise.all([getQuickJS()]).then(([qjs]) => createPacResolver(qjs, pacFile));
}

export async function getProxy(url: string, host: string): Promise<SocksProxyConfig | typeof DIRECT_PROXY_MODE> {
  if (!pacFile) {
    return proxyDomains.test(host) ? upstream : DIRECT_PROXY_MODE;
  }

  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Proxy_servers_and_tunneling/Proxy_Auto-Configuration_(PAC)_file
  const findProxyForURL = await findProxyForURLPromise;
  const res = await findProxyForURL(url, host);
  if (/DIRECT/.test(res)) {
    return DIRECT_PROXY_MODE;
  }

  const opts = res.split(';').map((s) => s.trim());
  const server = opts[Math.floor(Math.random() * opts.length)];

  const r = /^SOCKS(?<version>\d+)? (?<host>.+?):(?<port>\d+)$/.exec(server);

  if (!r) {
    throw new Error('Unsupported proxy mode');
  }

  return {
    type: parseInt(r.groups.version || '5', 10) as 4 | 5,
    host: r.groups.host,
    port: parseInt(r.groups.port, 10),
  };
}
