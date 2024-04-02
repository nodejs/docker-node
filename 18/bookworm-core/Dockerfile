FROM debian:bookworm-slim

RUN groupadd --gid 1000 node \
  && useradd --uid 1000 --gid node --shell /bin/bash --create-home node

ENV NODE_VERSION 18.20.1

COPY --from=node:18.20.1-bookworm-slim --link /usr/local/bin/ /usr/local/bin/
COPY --from=node:18.20.1-bookworm-slim --link /usr/local/include/node/ /usr/local/include/node/

ENTRYPOINT ["docker-entrypoint.sh"]

CMD [ "node" ]
