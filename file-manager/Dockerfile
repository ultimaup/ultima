FROM node:alpine

RUN \
    apk add --no-cache ca-certificates && \
    apk add --no-cache --virtual .build-deps curl && \
    curl https://dl.min.io/client/mc/release/linux-amd64/mc > /usr/bin/mcli && \
    chmod +x /usr/bin/mcli && apk del .build-deps