#!/bin/bash
set -e

cd $(cd ${0%/*} && pwd -P);

versions=( "$@" )
if [ ${#versions[@]} -eq 0 ]; then
	versions=( */ )
fi
versions=( "${versions[@]%/}" )

for version in "${versions[@]}"; do
	fullVersion="$(curl -sSL --compressed 'https://nodejs.org/dist' | grep '<a href="v'"$version." | sed -E 's!.*<a href="v([^"/]+)/?".*!\1!' | cut -f 3 -d . | sort -n | tail -1)"
	(
		sed -E -i.bak '
			s/^(ENV NODE_VERSION) .*/\1 '"$version.$fullVersion"'/;
		' "$version/Dockerfile" "$version/slim/Dockerfile" "$version/wheezy/Dockerfile"
		rm $version/Dockerfile.bak $version/slim/Dockerfile.bak $version/wheezy/Dockerfile.bak

		sed -E -i.bak 's/^(FROM node):.*/\1:'"$version.$fullVersion"'/' "$version/onbuild/Dockerfile"
		rm $version/onbuild/Dockerfile.bak

	)
done
