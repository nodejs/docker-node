#!/bin/bash
set -e

cd "$(dirname "$(readlink -f "$BASH_SOURCE")")"

versions=( "$@" )
if [ ${#versions[@]} -eq 0 ]; then
	versions=( */ )
fi
versions=( "${versions[@]%/}" )

npmVersion="$(docker run --rm node npm show npm version)"
for version in "${versions[@]}"; do
	fullVersion="$(curl -sSL --compressed 'http://nodejs.org/dist' | grep '<a href="v'"$version." | sed -r 's!.*<a href="v([^"/]+)/?".*!\1!' | sort -V | tail -1)"
	(
		set -x
		sed -ri '
			s/^(ENV NODE_VERSION) .*/\1 '"$fullVersion"'/;
			s/^(ENV NPM_VERSION) .*/\1 '"$npmVersion"'/;
		' "$version/Dockerfile" "$version/slim/Dockerfile"
		sed -ri 's/^(FROM node):.*/\1:'"$fullVersion"'/' "$version/onbuild/Dockerfile"
	)
done
