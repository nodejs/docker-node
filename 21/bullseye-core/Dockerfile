FROM debian:bullseye-slim

RUN groupadd --gid 1000 node \
  && useradd --uid 1000 --gid node --shell /bin/bash --create-home node

ENV NODE_VERSION 21.7.2

COPY --from=node:21.7.2-bullseye-slim --link /usr/local/bin/ /usr/local/bin/
COPY --from=node:21.7.2-bullseye-slim --link /usr/local/include/node/ /usr/local/include/node/

ENTRYPOINT ["docker-entrypoint.sh"]

CMD [ "node" ]
