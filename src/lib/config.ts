import { readFileSync } from 'fs';
import { isIP } from 'net';

// env vars

// server
export const listenHost = isIP(process.env.LISTEN_HOST || '') ? process.env.LISTEN_HOST : '0.0.0.0';
export const listenPort = parseInt(process.env.PORT || '9090', 10) || 9090;

// connection
export const socksConnectTimeout = parseInt(process.env.CONNECT_TIMEOUT || '30000', 10) || 30000;

// application
export const proxyDomains = ((patterns: string) => {
  return new RegExp(
    '^(?:' +
      patterns
        .split(',')
        .map((s) => s.trim())
        .join('|') +
      ')$',
    'i',
  );
})(process.env.PROXY_DOMAINS || '.+');

export const pacFile = ((filepath: string) => {
  if (!filepath) {
    return '';
  }

  const pacFile = readFileSync(filepath, 'utf8');

  if (!pacFile || !/function FindProxyForURL\(url, host\) {/.test(pacFile)) {
    throw new Error('Invalid proxy pac file');
  }

  return pacFile;
})(process.env.PAC_FILE || '');

export const upstream = ((upstream: string) => {
  if (!/^socks(4|4a|5):\/\/.+?:\d+$/.test(upstream)) {
    return null;
  }
  const r = /^socks(?<version>4|5)a?:\/\/(?<host>.+?):(?<port>\d+)$/.exec(upstream);

  return {
    type: parseInt(r.groups.version, 10) as 4 | 5,
    host: r.groups.host,
    port: parseInt(r.groups.port, 10),
  };
})(process.env.UPSTREAM_SERVER || '');
