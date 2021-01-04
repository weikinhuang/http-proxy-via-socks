import { proxyDomains } from './config';

export function shouldProxy(host: string): boolean {
  return proxyDomains.test(host);
}
