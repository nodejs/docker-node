#!/usr/bin/env bash

set -e
. functions.sh

hash git 2> /dev/null || { echo >&2 "git not found, exiting."; }

# Used dynamically: print "$array_" $1
# shellcheck disable=SC2034
array_10='10 dubnium'
# shellcheck disable=SC2034
array_12='12 erbium lts'
# shellcheck disable=SC2034
array_14='14 latest current'

default_variant=$(get_config "./" "default_variant")

default_alpine=$(get_config "./" "alpine_version")

cd "$(cd "${0%/*}" && pwd -P)"

self="$(basename "${BASH_SOURCE[0]}")"

IFS=' ' read -ra versions <<< "$(get_versions)"
IFS=' ' read -ra versions <<< "$(sort_versions "${versions[@]}")"
url='https://github.com/nodejs/docker-node'

# get the most recent commit which modified any of "$@"
fileCommit() {
  git log -1 --format='format:%H' HEAD -- "$@"
}

echo "# this file is generated via ${url}/blob/$(fileCommit "${self}")/${self}"
echo
echo "Maintainers: The Node.js Docker Team <${url}> (@nodejs)"
echo "GitRepo: ${url}.git"
echo

# prints "$2$1$3$1...$N"
join() {
  local sep="$1"
  shift
  local out
  printf -v out "${sep//%/%%}%s" "$@"
  echo "${out#$sep}"
}

get_stub() {
  local version="${1}"
  shift
  IFS='/' read -ra versionparts <<< "${version}"
  local stub
  eval stub="$(join '_' "${versionparts[@]}" | awk -F. '{ print "$array_" $1 }')"
  echo "${stub}"
}

for version in "${versions[@]}"; do
  # Skip "docs" and other non-docker directories
  [ -f "${version}/Dockerfile" ] || [ -f "${version}/${default_variant}/Dockerfile" ] || continue

  stub=$(get_stub "${version}")
  commit="$(fileCommit "${version}")"
  fullVersion="$(get_tag "${version}" full)"
  majorMinorVersion="$(get_tag "${version}" majorminor)"

  IFS=' ' read -ra versionAliases <<< "$fullVersion $majorMinorVersion $stub"

  if [ -f "${version}/Dockerfile" ]; then
    # Get supported architectures for a specific version. See details in function.sh
    IFS=' ' read -ra supportedArches <<< "$(get_supported_arches "${version}" "default")"

    echo "Tags: $(join ', ' "${versionAliases[@]}")"
    echo "Architectures: $(join ', ' "${supportedArches[@]}")"
    echo "GitCommit: ${commit}"
    echo "Directory: ${version}"
    echo
  fi

  # Get supported variants according to the target architecture.
  # See details in function.sh
  IFS=' ' read -ra variants <<< "$(get_variants "$(dirname "${version}")")"
  for variant in "${variants[@]}"; do
    # Skip non-docker directories
    [ -f "${version}/${variant}/Dockerfile" ] || continue

    commit="$(fileCommit "${version}/${variant}")"

    slash='/'
    variantAliases=("${versionAliases[@]/%/-${variant//${slash}/-}}")
    if [ "${variant}" = "${default_variant}-slim" ]; then
      variantAliases+=("${versionAliases[@]/%/-slim}")
    elif [ "${variant}" = "alpine${default_alpine}" ]; then
      variantAliases+=("${versionAliases[@]/%/-alpine}")
    elif [ "${variant}" = "${default_variant}" ]; then
      variantAliases+=("${versionAliases[@]}")
    fi
    variantAliases=("${variantAliases[@]//latest-/}")

    # Get supported architectures for a specific version and variant.
    # See details in function.sh
    IFS=' ' read -ra supportedArches <<< "$(get_supported_arches "${version}" "${variant}")"

    echo "Tags: $(join ', ' "${variantAliases[@]}")"
    echo "Architectures: $(join ', ' "${supportedArches[@]}")"
    echo "GitCommit: ${commit}"
    echo "Directory: ${version}/${variant}"
    echo
  done
done
