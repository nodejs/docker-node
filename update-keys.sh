#!/bin/sh -ex

KEYRING_URL=$(curl -fsIo /dev/null -w '%header{Location}' https://github.com/nodejs/release-keys/raw/HEAD/gpg-only-active-keys/pubring.kbx)
TMP_DIR=$(mktemp -d)
trap 'rm -r "$TMP_DIR"; trap - EXIT; exit' EXIT INT HUP
(cd "$TMP_DIR" && curl -fsSO "$KEYRING_URL" && sha256sum pubring.kbx) > keys/nodejs.shasum

gpg --no-default-keyring --keyring "$TMP_DIR/pubring.kbx" --list-keys --with-colons |\
  awk -F: '{ if (print_next_line) { print $10; print_next_line=0; } else if ($1=="pub") print_next_line=1; }' > keys/nodejs.keys
echo "$KEYRING_URL" > keys/nodejs.url
