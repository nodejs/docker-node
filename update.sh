#!/bin/bash
set -e

cd "$(cd "${0%/*}" && pwd -P)";

versions=( "$@" )
if [ ${#versions[@]} -eq 0 ]; then
	versions=( */ )
fi
versions=( "${versions[@]%/}" )


template=
dockerfile=

yarnVersion="$(curl -sSL --compressed https://yarnpkg.com/latest-version)"

function update_node_version {
	fullVersion="$(curl -sSL --compressed 'https://nodejs.org/dist' | grep '<a href="v'"$version." | sed -E 's!.*<a href="v([^"/]+)/?".*!\1!' | cut -f 3 -d . | sort -n | tail -1)"
	(
		cp $template $dockerfile
		sed -E -i.bak 's/^(ENV NODE_VERSION |FROM node:).*/\1'"$version.$fullVersion"'/' "$dockerfile"
		rm "$dockerfile.bak"
		sed -E -i.bak 's/^(ENV YARN_VERSION ).*/\1'"$yarnVersion"'/' "$dockerfile"
		rm "$dockerfile.bak"
		if [[ "${version/.*/}" -ge 8 ]]; then
			sed -E -i.bak 's/FROM alpine:3.4/FROM alpine:3.6/' "$dockerfile"
			rm "$dockerfile.bak"
		fi
	)
}

for version in "${versions[@]}"; do
	# Skip "docs" and other non-docker directories
	[ -f "$version/Dockerfile" ] || continue

	template="Dockerfile.template"
	dockerfile="$version/Dockerfile"

	update_node_version

	variants=$(echo "$version"/*/ | xargs -n1 basename)

	for variant in $variants; do
		# Skip non-docker directories
		[ -f "$version/$variant/Dockerfile" ] || continue

		template="Dockerfile-$variant.template"
		dockerfile="$version/$variant/Dockerfile"

		update_node_version

	done
done
