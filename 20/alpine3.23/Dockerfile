FROM alpine:3.23

ENV NODE_VERSION=20.20.2

RUN addgroup -g 1000 node \
    && adduser -u 1000 -G node -s /bin/sh -D node \
    && apk add --no-cache \
        libstdc++ \
    && apk add --no-cache --virtual .build-deps \
        curl \
    && ARCH= OPENSSL_ARCH='linux*' && alpineArch="$(apk --print-arch)" \
      && case "${alpineArch##*-}" in \
        x86_64) ARCH='x64' CHECKSUM="2b51a5388f6aaf8e2af65fe3bad6114db0ebd81a1ae1250b1de0cbf034b10c5d" OPENSSL_ARCH=linux-x86_64;; \
        x86) OPENSSL_ARCH=linux-elf;; \
        aarch64) OPENSSL_ARCH=linux-aarch64;; \
        arm*) OPENSSL_ARCH=linux-armv4;; \
        ppc64le) OPENSSL_ARCH=linux-ppc64le;; \
        s390x) OPENSSL_ARCH=linux-s390x;; \
        *) ;; \
      esac \
  && if [ -n "${CHECKSUM}" ]; then \
    set -eu; \
    curl -fsSLO --compressed "https://unofficial-builds.nodejs.org/download/release/v$NODE_VERSION/node-v$NODE_VERSION-linux-$ARCH-musl.tar.xz"; \
    echo "$CHECKSUM  node-v$NODE_VERSION-linux-$ARCH-musl.tar.xz" | sha256sum -c - \
      && tar -xJf "node-v$NODE_VERSION-linux-$ARCH-musl.tar.xz" -C /usr/local --strip-components=1 --no-same-owner \
      && ln -s /usr/local/bin/node /usr/local/bin/nodejs; \
  else \
    echo "Building from source" \
    # backup build
    && apk add --no-cache --virtual .build-deps-full \
        binutils-gold \
        g++ \
        gcc \
        gnupg \
        gpgv \
        libgcc \
        linux-headers \
        make \
        python3 \
        py-setuptools \
    && export GNUPGHOME="$(mktemp -d)" \
    && (cd "$GNUPGHOME" && curl -fsSLO --compressed "https://raw.githubusercontent.com/nodejs/release-keys/7b6eb2d6ab524bb30487f31612cdbeb35ae37533/gpg-only-active-keys/pubring.kbx" && echo "70da4cac9d0487c1776c66403d5f6fe79991f1ba34fae96416037de1950197e1  pubring.kbx" | sha256sum -c) \
    && [ "$(gpg --no-default-keyring --keyring "$GNUPGHOME/pubring.kbx" --list-keys --with-colons | awk -F: '{ if ($1=="fpr") print $10 }')" = "$(printf '5BE8A3F6C8A5C01D106C0AD820B1A390B168D356\n0A178CD0FE03CB4F8780980A039F94E89826F891\nDD792F5973C6DE52C432CBDAC77ABFA00DDBF2B7\n74CD01639B02F3361D0918140D0792FB9ACAD426\nCC68F5A3106FF448322E48ED27F5E38D5B0A215F\n80E6380360B2E90F2C9A3AA6C0AB7FA4DC8F4063\n8FCCA13FEF1D0C2E91008E09770F7A9A5AE15600\nEDC5FCAE2317BA6060FDB92C4708964F8085DFE7\n86C8D74642E67846F8E120284DAA80D1E737BC9F\n890C08DB8579162FEE0DF9DB8BEAB4DFCF555EF4\n4104B1A1F784A8AE9E0C2A5105DE7928107F3DC0\nC82FA3AE1CBEDC6BE46B9360C43CEC45C17AB93C\nC4960C6DAA2AEBC352F3E5B8E140F61BC5979DCC\n108F52B48DB57BB0CC439B2997B01419BD92F80A\n9FC51CEA112B1655FA9398E2E04111EEE1A956A5\nA363A499291CBBC940DD62E41F10027AF002F8B0\nC2B25D9B4272DB29565BA87F3C7824F39A895758\nA6023530FC53461FEC91F99C04CD3F2FDE079578\n7C1F423FA1A6C8F34C1C9924900A296076CFC675\n')" ] \
    && curl -fsSLO --compressed "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION.tar.xz" \
    && curl -fsSLO --compressed "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt.asc" \
    && gpgv --keyring="$GNUPGHOME/pubring.kbx" --output SHASUMS256.txt < SHASUMS256.txt.asc \
    && rm -rf "$GNUPGHOME" \
    && grep " node-v$NODE_VERSION.tar.xz\$" SHASUMS256.txt | sha256sum -c - \
    && tar -xf "node-v$NODE_VERSION.tar.xz" \
    && cd "node-v$NODE_VERSION" \
    && ./configure \
    && make -j$(getconf _NPROCESSORS_ONLN) V= \
    && make install \
    && apk del .build-deps-full \
    && cd .. \
    && rm -Rf "node-v$NODE_VERSION" \
    && rm "node-v$NODE_VERSION.tar.xz" SHASUMS256.txt.asc SHASUMS256.txt; \
  fi \
  && rm -f "node-v$NODE_VERSION-linux-$ARCH-musl.tar.xz" \
  # Remove unused OpenSSL headers to save ~34MB. See this NodeJS issue: https://github.com/nodejs/node/issues/46451
  && find /usr/local/include/node/openssl/archs -mindepth 1 -maxdepth 1 ! -name "$OPENSSL_ARCH" -exec rm -rf {} \; \
  && apk del .build-deps \
  # smoke tests
  && node --version \
  && npm --version \
  && rm -rf /tmp/*

ENV YARN_VERSION=1.22.22

RUN apk add --no-cache --virtual .build-deps-yarn curl gnupg tar \
  # use pre-existing gpg directory, see https://github.com/nodejs/docker-node/pull/1895#issuecomment-1550389150
  && export GNUPGHOME="$(mktemp -d)" \
  && for key in \
    6A010C5166006599AA17F08146C2130DFD2497F5 \
  ; do \
    { gpg --batch --keyserver hkps://keys.openpgp.org --recv-keys "$key" && gpg --batch --fingerprint "$key"; } || \
    { gpg --batch --keyserver keyserver.ubuntu.com --recv-keys "$key" && gpg --batch --fingerprint "$key"; } ; \
  done \
  && curl -fsSLO --compressed "https://yarnpkg.com/downloads/$YARN_VERSION/yarn-v$YARN_VERSION.tar.gz" \
  && curl -fsSLO --compressed "https://yarnpkg.com/downloads/$YARN_VERSION/yarn-v$YARN_VERSION.tar.gz.asc" \
  && gpg --batch --verify yarn-v$YARN_VERSION.tar.gz.asc yarn-v$YARN_VERSION.tar.gz \
  && gpgconf --kill all \
  && rm -rf "$GNUPGHOME" \
  && mkdir -p /opt \
  && tar -xzf yarn-v$YARN_VERSION.tar.gz -C /opt/ \
  && ln -s /opt/yarn-v$YARN_VERSION/bin/yarn /usr/local/bin/yarn \
  && ln -s /opt/yarn-v$YARN_VERSION/bin/yarnpkg /usr/local/bin/yarnpkg \
  && rm yarn-v$YARN_VERSION.tar.gz.asc yarn-v$YARN_VERSION.tar.gz \
  && apk del .build-deps-yarn \
  # smoke test
  && yarn --version \
  && rm -rf /tmp/*

COPY docker-entrypoint.sh /usr/local/bin/
ENTRYPOINT ["docker-entrypoint.sh"]

CMD [ "node" ]
