# build and test application
FROM node:20-bullseye-slim as compile

ENV NODE_ENV=development

WORKDIR /tmp
COPY package.json package-lock.json /tmp/
RUN set -ex \
    && npm ci

COPY . /tmp/
RUN set -ex \
    && npm run lint \
    && npm run test \
    && npm run build \
    && ( find . -name '__mocks__' -exec rm -rf {} \; || true ) \
    && ( find . -name '*.spec.js' -exec rm -rf {} \; || true ) \
    && find . -name '*.ts' -exec rm -rf {} \;

# install node modules
FROM node:20-bullseye-slim as nodemodules

WORKDIR /tmp
COPY package.json package-lock.json /tmp/
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
RUN set -ex \
    && npm ci

FROM debian:bullseye-slim

# Install dependencies
RUN set -ex \
    && apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        tini \
    && apt-get purge -y --auto-remove \
    && rm -rf /var/lib/apt/lists/*

# from the official docker image for node
COPY --from=nodemodules /usr/local/bin/node /usr/local/bin/node

# app variables
ENV APP_ROOT          /opt/app

# make app directory
RUN set -ex \
    && mkdir -p \
        $APP_ROOT

# generate the node_modules directory
ARG NODE_ENV=production
ENV NODE_ENV          $NODE_ENV
COPY /package.json /package-lock.json $APP_ROOT/
COPY --from=nodemodules /tmp/node_modules $APP_ROOT/node_modules

# increase the libuv threadpool size
# @see https://nodejs.org/api/cli.html#cli_uv_threadpool_size_size
ENV UV_THREADPOOL_SIZE  128

# copy container overlay
# COPY /container /

WORKDIR $APP_ROOT

# copy application
COPY --from=compile /tmp/dist $APP_ROOT/src

USER nobody

ENTRYPOINT [ "tini", "-s", "-g", "--" ]
CMD [ "node", "--no-deprecation", "--enable-source-maps", "/opt/app/src/index.js" ]

LABEL org.opencontainers.image.authors="Wei Kin Huang"
LABEL org.opencontainers.image.description="Conditionally forward requests for HTTP_PROXY and HTTPS_PROXY"
LABEL org.opencontainers.image.documentation="https://github.com/weikinhuang/http-proxy-via-socks"
LABEL org.opencontainers.image.source="https://github.com/weikinhuang/http-proxy-via-socks"
LABEL org.opencontainers.image.title="http-proxy-via-socks"
LABEL org.opencontainers.image.vendor="Wei Kin Huang"
