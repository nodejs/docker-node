#!/bin/bash
set -e

hash git 2>/dev/null || { echo >&2 "git not found, exiting."; }

array_4_0='0 latest';

cd $(cd ${0%/*} && pwd -P);

versions=( */ )
versions=( "${versions[@]%/}" )
url='git://github.com/joyent/docker-node'

echo '# maintainer: Joyent Image Team <image-team@joyent.com> (@joyent)'

for version in "${versions[@]}"; do
	eval stub=$(echo "$version" | awk -F. '{ print "$array_" $1 "_" $2 }');
	commit="$(git log -1 --format='format:%H' -- "$version")"
	fullVersion="$(grep -m1 'ENV NODE_VERSION ' "$version/Dockerfile" | cut -d' ' -f3)"

	versionAliases=( $fullVersion $version ${stub} )

	echo	
	for va in "${versionAliases[@]}"; do
		echo "$va: ${url}@${commit} $version"
	done

	for variant in onbuild slim wheezy; do
		commit="$(git log -1 --format='format:%H' -- "$version/$variant")"
		echo
		for va in "${versionAliases[@]}"; do
			if [ "$va" = 'latest' ]; then
				va="$variant"
			else
				va="$va-$variant"
			fi
			echo "$va: ${url}@${commit} $version/$variant"
		done
	done
done
