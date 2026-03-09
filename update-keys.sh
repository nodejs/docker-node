#!/bin/sh -ex

KEYRING_URL=$(curl -fsIo /dev/null -w '%header{Location}' https://github.com/nodejs/release-keys/raw/HEAD/gpg-only-active-keys/pubring.kbx)
TMP_DIR=$(mktemp -d)
(cd "$TMP_DIR" && curl -fsSO "$KEYRING_URL" && sha256sum pubring.kbx) > keys/nodejs.shasum
echo "$KEYRING_URL" > keys/nodejs.url
rm -r "$TMP_DIR"
