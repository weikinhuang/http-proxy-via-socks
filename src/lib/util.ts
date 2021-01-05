import { proxyDomains } from './config';

export async function shouldProxy(host: string): Promise<boolean> {
  // @todo: replace with pac file parser
  return proxyDomains.test(host);
}
