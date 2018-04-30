#!/usr/bin/env bash
#
# Run a test build for all images.

set -uo pipefail

. functions.sh

# Convert comma delimited cli arguments to arrays
# E.g. ./test-build.sh 8,10 slim,onbuild
# "8,10" becomes "8 10" and "slim,onbuild" becomes "slim onbuild"
IFS=',' read -ra versions_arg <<<"${1:-}"
IFS=',' read -ra variant_arg <<<"${2:-}"

default_variant=$(get_config "./" "default_variant")

function build() {
  local version
  local tag
  local variant
  local full_tag
  local path
  version="$1"
  shift
  variant="$1"
  shift
  tag="$1"
  shift

  if [ -z "${variant}" ]; then
    full_tag="${tag}"
    path="${version}/${variant}"
  elif [ "${variant}" = "default" ]; then
    full_tag="${tag}"
    path="${version}"
  else
    full_tag="${tag}-${variant}"
    path="${version}/${variant}"
  fi

  info "Building ${full_tag}..."

  if ! docker build --cpuset-cpus="0,1" -t node:"${full_tag}" "${path}"; then
    fatal "Build of ${full_tag} failed!"
  fi
  info "Build of ${full_tag} succeeded."

  info "Testing ${full_tag}"
  docker run --rm -v "$PWD/test-image.sh:/usr/local/bin/test.sh" node:"${full_tag}" test.sh "${full_version}"
}

cd "$(cd "${0%/*}" && pwd -P)" || exit

IFS=' ' read -ra versions <<<"$(get_versions . "${versions_arg[@]}")"
if [ ${#versions[@]} -eq 0 ]; then
  fatal "No valid versions found!"
fi

for version in "${versions[@]}"; do
  # Skip "docs" and other non-docker directories
  [ -f "${version}/Dockerfile" ] || [ -a "${version}/${default_variant}/Dockerfile" ] || continue

  tag=$(get_tag "${version}")
  full_version=$(get_full_version "${version}")

  # Get supported variants according to the target architecture.
  # See details in function.sh
  IFS=' ' read -ra variants <<<"$(get_variants "$(dirname "${version}")" "${variant_arg[@]}")"

  for variant in "${variants[@]}"; do
    # Skip non-docker directories
    [ -f "${version}/${variant}/Dockerfile" ] || continue

    if [ "${variant}" = "onbuild" ]; then
      build "${version}" "${default_variant}" "$tag"
    fi

    build "${version}" "${variant}" "${tag}"
  done

done

info "All builds successful!"

exit 0
