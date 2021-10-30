FROM node:14.18.1-alpine3.12
FROM alpine:3.12

COPY --from=0 /usr/local/bin/node /usr/local/bin/
COPY --from=0 /usr/local/bin/docker-entrypoint.sh /usr/local/bin/

RUN addgroup -g 1000 node \
    && adduser -u 1000 -G node -s /bin/sh -D node \
    && apk add --no-cache \
        libstdc++ \
    && apk add --no-cache --virtual .build-deps \
        binutils \
  && strip /usr/local/bin/node \
  && apk del .build-deps \
  && node --version

ENTRYPOINT ["docker-entrypoint.sh"]

CMD [ "node" ]
