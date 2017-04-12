#!/bin/bash
set -e

hash git 2>/dev/null || { echo >&2 "git not found, exiting."; }

array_4_8='4 argon';
array_6_10='6 boron';
array_7_9='7 latest';

cd $(cd ${0%/*} && pwd -P);

self="$(basename "$BASH_SOURCE")"

versions=( */ )
versions=( "${versions[@]%/}" )
url='https://github.com/nodejs/docker-node'

# sort version numbers with highest first
IFS=$'\n'; versions=( $(echo "${versions[*]}" | sort -r) ); unset IFS

# get the most recent commit which modified any of "$@"
fileCommit() {
	git log -1 --format='format:%H' HEAD -- "$@"
}

echo "# this file is generated via ${url}/blob/$(fileCommit "$self")/$self"
echo
echo "Maintainers: The Node.js Docker Team <${url}> (@nodejs)"
echo "GitRepo: ${url}.git"
echo

# prints "$2$1$3$1...$N"
join() {
	local sep="$1"; shift
	local out; printf -v out "${sep//%/%%}%s" "$@"
	echo "${out#$sep}"
}

for version in "${versions[@]}"; do
	# Skip "docs" and other non-docker directories
	[ -f "$version/Dockerfile" ] || continue
	
	eval stub=$(echo "$version" | awk -F. '{ print "$array_" $1 "_" $2 }');
	commit="$(fileCommit "$version")"
	fullVersion="$(grep -m1 'ENV NODE_VERSION ' "$version/Dockerfile" | cut -d' ' -f3)"

	versionAliases=( $fullVersion $version ${stub} )
	
	echo "Tags: $(join ', ' "${versionAliases[@]}")"
	echo "GitCommit: ${commit}"
	echo "Directory: ${version}"
	echo

	variants=$(echo $version/*/ | xargs -n1 basename)
	for variant in $variants; do
		# Skip non-docker directories
		[ -f "$version/$variant/Dockerfile" ] || continue
		
		commit="$(fileCommit "$version/$variant")"
		
		slash='/'
		variantAliases=( "${versionAliases[@]/%/-${variant//$slash/-}}" )
		variantAliases=( "${variantAliases[@]//latest-/}" )

		echo "Tags: $(join ', ' "${variantAliases[@]}")"
		echo "GitCommit: ${commit}"
		echo "Directory: ${version}/${variant}"
		echo
	done
done
