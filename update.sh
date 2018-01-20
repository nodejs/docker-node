#!/bin/bash
set -e

. functions.sh

cd "$(cd "${0%/*}" && pwd -P)";

versions=( "$@" )
if [ ${#versions[@]} -eq 0 ]; then
	versions=( */ )
fi
versions=( "${versions[@]%/}" )

# Global variables
# Get architecure and use this as target architecture for docker image
# See details in function.sh
# TODO: Should be able to specify target architecture manually
arch=$(get_arch)

yarnVersion="$(curl -sSL --compressed https://yarnpkg.com/latest-version)"

function update_node_version {

	local template=$1
	shift
	local dockerfile=$1
	shift
	local variant=
	if [[ $# -eq 1 ]]; then
		variant=$1
		shift
	fi

	fullVersion="$(curl -sSL --compressed 'https://nodejs.org/dist' | grep '<a href="v'"$version." | sed -E 's!.*<a href="v([^"/]+)/?".*!\1!' | cut -d'.' -f2,3| sort -n | tail -1)"
	(
		cp "$template" "$dockerfile"
		local fromprefix=
		if [[ "$arch" != "amd64" && "$variant" != "onbuild" ]]; then
			fromprefix="$arch\/"
		fi

		sed -E -i.bak 's/^FROM (.*)/FROM '"$fromprefix"'\1/' "$dockerfile" && rm "$dockerfile".bak
		sed -E -i.bak 's/^(ENV NODE_VERSION |FROM .*node:).*/\1'"$version.${fullVersion:-0}"'/' "$dockerfile" && rm "$dockerfile".bak
		sed -E -i.bak 's/^(ENV YARN_VERSION ).*/\1'"$yarnVersion"'/' "$dockerfile" && rm "$dockerfile".bak
		if [[ "${version/.*/}" -ge 8 || "$arch" = "ppc64le" || "$arch" = "s390x" || "$arch" = "arm64" || "$arch" = "arm32v7" ]]; then
			sed -E -i.bak 's/FROM (.*)alpine:3.4/FROM \1alpine:3.7/' "$dockerfile"
			rm "$dockerfile.bak"
		fi
	)
}

for version in "${versions[@]}"; do
	# Skip "docs" and other non-docker directories
	[ -f "$version/Dockerfile" ] || continue

	update_node_version "Dockerfile.template" "$version/Dockerfile"

	# Get supported variants according the target architecture
	# See details in function.sh
	variants=$(get_variants)

	for variant in $variants; do
		# Skip non-docker directories
		[ -f "$version/$variant/Dockerfile" ] || continue
		update_node_version "Dockerfile-$variant.template" "$version/$variant/Dockerfile" "$variant"

	done
done
