FROM buildpack-deps:bookworm

RUN groupadd --gid 1000 node \
  && useradd --uid 1000 --gid node --shell /bin/bash --create-home node

ENV NODE_VERSION=24.14.1

RUN ARCH= && dpkgArch="$(dpkg --print-architecture)" \
  && case "${dpkgArch##*-}" in \
    amd64) ARCH='x64';; \
    ppc64el) ARCH='ppc64le';; \
    s390x) ARCH='s390x';; \
    arm64) ARCH='arm64';; \
    armhf) ARCH='armv7l';; \
    i386) ARCH='x86';; \
    *) echo "unsupported architecture"; exit 1 ;; \
  esac \
  && export GNUPGHOME="$(mktemp -d)" \
  && set -ex \
  && command -v gpgv >/dev/null || (apt-get update && apt-get install --no-install-recommends -y gpgv) \
  && (cd "$GNUPGHOME" && curl -fsSLO --compressed "https://raw.githubusercontent.com/nodejs/release-keys/7b6eb2d6ab524bb30487f31612cdbeb35ae37533/gpg-only-active-keys/pubring.kbx" && echo "70da4cac9d0487c1776c66403d5f6fe79991f1ba34fae96416037de1950197e1  pubring.kbx" | sha256sum -c) \
  && [ "$(gpg --no-default-keyring --keyring "$GNUPGHOME/pubring.kbx" --list-keys --with-colons | awk -F: '{ if (print_next_line) { print $10; print_next_line=0; } else if ($1=="pub") print_next_line=1; }')" = "$(printf '5BE8A3F6C8A5C01D106C0AD820B1A390B168D356\nDD792F5973C6DE52C432CBDAC77ABFA00DDBF2B7\nCC68F5A3106FF448322E48ED27F5E38D5B0A215F\n8FCCA13FEF1D0C2E91008E09770F7A9A5AE15600\n890C08DB8579162FEE0DF9DB8BEAB4DFCF555EF4\nC82FA3AE1CBEDC6BE46B9360C43CEC45C17AB93C\n108F52B48DB57BB0CC439B2997B01419BD92F80A\nA363A499291CBBC940DD62E41F10027AF002F8B0\n')" ] \
  && curl -fsSLO --compressed "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-$ARCH.tar.xz" \
  && curl -fsSLO --compressed "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt.asc" \
  && gpgv --keyring="$GNUPGHOME/pubring.kbx" --output SHASUMS256.txt < SHASUMS256.txt.asc \
  && rm -rf "$GNUPGHOME" \
  && grep " node-v$NODE_VERSION-linux-$ARCH.tar.xz\$" SHASUMS256.txt | sha256sum -c - \
  && tar -xJf "node-v$NODE_VERSION-linux-$ARCH.tar.xz" -C /usr/local --strip-components=1 --no-same-owner \
  && rm "node-v$NODE_VERSION-linux-$ARCH.tar.xz" SHASUMS256.txt.asc SHASUMS256.txt \
  && ln -s /usr/local/bin/node /usr/local/bin/nodejs \
  # smoke tests
  && node --version \
  && npm --version \
  && rm -rf /tmp/*

ENV YARN_VERSION=1.22.22

RUN set -ex \
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
  # smoke test
  && yarn --version \
  && rm -rf /tmp/*

COPY docker-entrypoint.sh /usr/local/bin/
ENTRYPOINT ["docker-entrypoint.sh"]

CMD [ "node" ]
