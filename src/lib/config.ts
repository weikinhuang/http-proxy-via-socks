// env vars

// operator
export const port = parseInt(process.env.PORT || '9090', 10) || 9090;

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
