#!/bin/sh -ex

curl -fsSLo- --compressed https://github.com/nodejs/node/raw/master/README.md | awk '/^gpg --keyserver pool.sks-keyservers.net --recv-keys/ {print $NF}' > keys/node.keys
