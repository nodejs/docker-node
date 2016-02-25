FROM alpine:latest

ENV NPM_CONFIG_LOGLEVEL info
ENV NODE_VERSION=5.7.0

RUN apk --no-cache update \
    && apk --no-cache upgrade \
    && apk add --no-cache icu libintl libuv \
    && apk add --no-cache --virtual .build-deps \
        gcc \
        libgcc \
        g++ \
        libstdc++ \
        make \
        python \
        linux-headers \
        zlib-dev \
        libuv-dev \
        paxctl \
        binutils-gold \
        gnupg \
        curl \
        icu-dev \
        openssl-dev \
    && for key in \
        9554F04D7259F04124DE6B476D5A82AC7E37093B \
        94AE36675C464D64BAFA68DD7434390BDBE9B9C5 \
        0034A06D9D9B0064CE8ADF6BF1747F4AD2306D93 \
        FD3A5288F042B6850C66B31F09FE44734EB7990E \
        71DCFD284A79C3B38668286BC97EC7A07EDE3FC1 \
        DD8F2338BAE7501E3DD5AC78C273792F7D83545D \
        B9AE9905FFD7803F25714661B63B535A4C206CA9 \
        C4F0DFFF4E8C1A8236409D08E73BC641CC11F4C8 \
    ; do \
        gpg --keyserver ha.pool.sks-keyservers.net --recv-keys "$key"; \
    done \
    && curl -SLO "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION.tar.xz" \
    && curl -SLO "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt.asc" \
    && gpg --verify SHASUMS256.txt.asc \
    && grep " node-v$NODE_VERSION.tar.xz\$" SHASUMS256.txt.asc | sha256sum -c - \
    && mkdir -p /usr/src \
    && tar -xJf "node-v$NODE_VERSION.tar.xz" -C /usr/src \
    && rm node-v$NODE_VERSION.tar.xz SHASUMS256.txt.asc \
    && cd "/usr/src/node-v$NODE_VERSION" \
    && ./configure --prefix=/usr --with-intl=system-icu --shared-zlib --shared-libuv --shared-openssl \
    && make -j$(getconf _NPROCESSORS_ONLN) -C out mksnapshot BUILDTYPE=Release \
    && paxctl -cm out/Release/mksnapshot \
    && make -j$(getconf _NPROCESSORS_ONLN) \
    && make install \
    && paxctl -cm /usr/bin/node \
    && cd / \
    && apk del --virtual .build-deps \
    && rm -rf \
        /usr/src/* \
        /usr/share/doc \
        /usr/share/man \
        /usr/share/doc \
        /tmp/* \
        /var/cache/apk/* \
        /root/.npm \
        /root/.node-gyp \
        /usr/lib/node_modules/npm/man \
        /usr/lib/node_modules/npm/doc \
        /usr/lib/node_modules/npm/html

CMD [ "node" ]
