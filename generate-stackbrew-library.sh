#!/bin/bash
set -e

hash git 2>/dev/null || { echo >&2 "git not found, exiting."; }

array_0_12='0';
array_4_5='4 argon';
array_6_6='6 latest';

cd $(cd ${0%/*} && pwd -P);

versions=( */ )
versions=( "${versions[@]%/}" )
url='https://github.com/nodejs/docker-node'

echo "Maintainers: The Node.js Docker Team <${url}> (@nodejs)"
echo "GitRepo: ${url}.git"
echo

for version in "${versions[@]}"; do
	if [[ "$version" == "docs" ]]; then
		continue
	fi
	eval stub=$(echo "$version" | awk -F. '{ print "$array_" $1 "_" $2 }');
	commit="$(git log -1 --format='format:%H' -- "$version")"
	fullVersion="$(grep -m1 'ENV NODE_VERSION ' "$version/Dockerfile" | cut -d' ' -f3)"

	versionAliases=( $fullVersion $version ${stub} )
    echo "Tags: ${versionAliases[@]}"
    echo "GitCommit: ${commit}"
    echo "Directory: ${version}"
	echo
    
	variants=$(ls -d $version/*/ | awk -F"/" '{print $2}')
	for variant in $variants; do
		commit="$(git log -1 --format='format:%H' -- "$version/$variant")"
		tagVariants=$(printf "%s-${variant} " ${versionAliases[@]})
		echo "Tags: ${tagVariants}"
		echo "GitCommit: ${commit}"
		echo "Directory: ${version}/${variant}"
		echo
	done
done
