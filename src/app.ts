import * as http from 'http';
import { listenHost, listenPort } from './lib/config';
import { connect } from './lib/connect';
import logger from './lib/logger';
import { request } from './lib/request';

export default async function main(): Promise<void> {
  const server = http.createServer(() => {
    // empty
  });

  // for https
  server.addListener('connect', connect);
  // for http
  server.addListener('request', request);

  server.listen(listenPort, listenHost, () => {
    logger.notice({ channel: 'global', message: `application ready on ${listenHost}:${listenPort}` });
  });
}
