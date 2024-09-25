#!/bin/sh -ex

curl -fsSLo- --compressed https://github.com/nodejs/node/raw/main/README.md | awk '/--recv-keys.*#/{ gsub(/^.*--recv-keys\s+/,"");gsub(/\s+#.*$/,""); print }' > keys/node.keys
