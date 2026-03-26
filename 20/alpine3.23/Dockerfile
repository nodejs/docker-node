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
    && [ "$(gpg --no-default-keyring --keyring "$GNUPGHOME/pubring.kbx" --list-keys --with-colons | sort)" = "$(printf 'fpr:::::::::0A178CD0FE03CB4F8780980A039F94E89826F891:\nfpr:::::::::108F52B48DB57BB0CC439B2997B01419BD92F80A:\nfpr:::::::::4104B1A1F784A8AE9E0C2A5105DE7928107F3DC0:\nfpr:::::::::5BE8A3F6C8A5C01D106C0AD820B1A390B168D356:\nfpr:::::::::74CD01639B02F3361D0918140D0792FB9ACAD426:\nfpr:::::::::7C1F423FA1A6C8F34C1C9924900A296076CFC675:\nfpr:::::::::80E6380360B2E90F2C9A3AA6C0AB7FA4DC8F4063:\nfpr:::::::::86C8D74642E67846F8E120284DAA80D1E737BC9F:\nfpr:::::::::890C08DB8579162FEE0DF9DB8BEAB4DFCF555EF4:\nfpr:::::::::8FCCA13FEF1D0C2E91008E09770F7A9A5AE15600:\nfpr:::::::::9FC51CEA112B1655FA9398E2E04111EEE1A956A5:\nfpr:::::::::A363A499291CBBC940DD62E41F10027AF002F8B0:\nfpr:::::::::A6023530FC53461FEC91F99C04CD3F2FDE079578:\nfpr:::::::::C2B25D9B4272DB29565BA87F3C7824F39A895758:\nfpr:::::::::C4960C6DAA2AEBC352F3E5B8E140F61BC5979DCC:\nfpr:::::::::C82FA3AE1CBEDC6BE46B9360C43CEC45C17AB93C:\nfpr:::::::::CC68F5A3106FF448322E48ED27F5E38D5B0A215F:\nfpr:::::::::DD792F5973C6DE52C432CBDAC77ABFA00DDBF2B7:\nfpr:::::::::EDC5FCAE2317BA6060FDB92C4708964F8085DFE7:\npub:-:255:22:C77ABFA00DDBF2B7:1677815220:::-:::scESC:::::ed25519:::0:\npub:-:3072:1:8BEAB4DFCF555EF4:1652808932:1783525729::-:::scESC::::::23::0:\npub:-:4096:1:1F10027AF002F8B0:1561700538:1843474974::-:::scESC::::::23::0:\npub:-:4096:1:27F5E38D5B0A215F:1711645245:2027005245::-:::scESC::::::23::0:\npub:-:4096:1:770F7A9A5AE15600:1460037406:2080645689::-:::scESC::::::23::0:\npub:-:4096:1:97B01419BD92F80A:1500316168:::-:::scESC::::::23::0:\npub:-:4096:1:C43CEC45C17AB93C:1572264397:::-:::scESC::::::23::0:\npub:u:255:22:20B1A390B168D356:1751136988:::u:::scESC:::::ed25519:::0:\nsub:-:255:18:0D0792FB9ACAD426:1677815220::::::e:::::cv25519::\nsub:-:255:22:4DAA80D1E737BC9F:1763715081:1796821732:::::s:::::ed25519::\nsub:-:3072:1:05DE7928107F3DC0:1652808932:1783525772:::::e::::::23:\nsub:-:4096:1:3C7824F39A895758:1752853787:1815925787:::::s::::::23:\nsub:-:4096:1:4708964F8085DFE7:1460037406:1796821732:::::e::::::23:\nsub:-:4096:1:900A296076CFC675:1752854012:1815926012:::::e::::::23:\nsub:-:4096:1:C0AB7FA4DC8F4063:1711645245:2027005245:::::e::::::23:\nsub:-:4096:1:E04111EEE1A956A5:1500316168::::::e::::::23:\nsub:-:4096:1:E140F61BC5979DCC:1572264397::::::e::::::23:\nsub:e:4096:1:04CD3F2FDE079578:1561700538:1748764157:::::esa::::::23:\nsub:u:255:18:039F94E89826F891:1751136988::::::e:::::cv25519::\ntru::1:1773151472:0:3:1:5\nuid:-::::1500316168::3CFC768A41C5BE8C983059A28D8595626C6CD057::Ruy Adorno <ruyadorno@hotmail.com>::::::::::0:\nuid:-::::1601568743::7BB2C566F0EF871E6DCE4750115AF255D9CB7C6E::Richard Lau <rlau@redhat.com>::::::::::0:\nuid:-::::1677815220::AF13231F48008C33AEA635A785BA0A1992AF63C4::Juan José Arboleda <soyjuanarbol@gmail.com>::::::::::0:\nuid:-::::1711645245::443D6CD345E6710170F58F30FC9FB06B252609BE::marco-ippolito <marcoippolito54@gmail.com>::::::::::0:\nuid:-::::1720453729::66A91B5771A948CA2971C034212CEE70A68C9EB0::RafaelGSS <rafael.nunu@hotmail.com>::::::::::0:\nuid:-::::1748866974::BB866FA1E1E4EC9C258B9C5853C506BD8B09A621::ulises Gascon <ulisesgascongonzalez@gmail.com>::::::::::0:\nuid:-::::1750870996::01B4EEEA930298F058DF62CD37570ECC9365C0BE::Richard Lau <richard.lau@ibm.com>::::::::::0:\nuid:-::::1765285689::5B411E4EE395C91BA7BE1C76FE7C0DC49700A620::Michaël Zasso (Targos) <targos@protonmail.com>::::::::::0:\nuid:r::::::1312A91B920AF6003812E73DC6C19CC96FABFB7A::Richard Lau <riclau@uk.ibm.com>::::::::::0:\nuid:u::::1751136988::7F77C9100C2C063FE76864416CF5F377EFAF96DC::Antoine du Hamel <duhamelantoine1995@gmail.com>::::::::::0:\nuid:u::::1773151025::4B64E9AA67E282998FC0CD9E607DDC59D07EF0D6::Antoine du Hamel <antoine.duhamel@platformatic.dev>::::::::::0:
')" ] \
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
