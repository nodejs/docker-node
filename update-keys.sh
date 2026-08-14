#!/bin/sh -ex

curl -fsSLO --compressed "https://github.com/nodejs/release-keys/raw/refs/heads/main/gpg-only-active-keys/pubring.kbx"

gpg --no-default-keyring --keyring "./pubring.kbx" --keyid-format long --with-colons --fingerprint | awk -F: '/^pub:.*/ { getline; print $10}' > keys/node.keys

rm pubring.kbx
