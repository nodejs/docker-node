#!/bin/sh -ex

curl -fsSLo- --compressed https://github.com/nodejs/node/raw/master/README.md | awk '/^gpg --keyserver hkps:\/\/keys\.openpgp\.org --recv-keys/ {print $NF}' > keys/node.keys
