#!/usr/bin/env bash
#
# Run a test build for all images.

set -euo pipefail

. functions.sh

# Convert comma delimited cli arguments to arrays
# E.g. ./test-build.sh 8,10 slim,onbuild
# "8,10" becomes "8 10" and "slim,onbuild" becomes "slim onbuild"
IFS=',' read -ra versions_arg <<< "${1:-}"
IFS=',' read -ra variant_arg <<< "${2:-}"

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

  full_tag=$(get_full_tag "${variant}" "${tag}")
  path=$(get_path "${version}" "${variant}")

  info "Building ${full_tag}..."

  if ! docker build --cpuset-cpus="0,1" -t node:"${full_tag}" "${path}"; then
    fatal "Build of ${full_tag} failed!"
  fi
  info "Build of ${full_tag} succeeded."
}

function test_image() {
  local full_version
  local variant
  local tag
  local full_tag
  full_version="$1"
  shift
  variant="$1"
  shift
  tag="$1"
  shift

  full_tag=$(get_full_tag "${variant}" "${tag}")

  info "Testing ${full_tag}"
  (
    export full_version=${full_version}
    export variant=${variant}
    export full_tag=${full_tag}
    bats test-image.bats
  )
}

cd "$(cd "${0%/*}" && pwd -P)" || exit

IFS=' ' read -ra versions <<< "$(get_versions . "${versions_arg[@]}")"
if [ ${#versions[@]} -eq 0 ]; then
  fatal "No valid versions found!"
fi

for version in "${versions[@]}"; do
  # Skip "docs" and other non-docker directories
  [ -f "${version}/Dockerfile" ] || [ -a "${version}/${default_variant}/Dockerfile" ] || continue

  tag=$(get_tag "${version}")
  full_version=$(get_full_version "${version}")

  # Required for chakracore
  if [ -f "${version}/Dockerfile" ]; then
    build "${version}" "default" "${tag}"
    test_image "${full_version}" "default" "${tag}"
  fi

  # Get supported variants according to the target architecture.
  # See details in function.sh
  IFS=' ' read -ra variants <<< "$(get_variants "$(dirname "${version}")" "${variant_arg[@]}")"

  for variant in "${variants[@]}"; do
    # Skip non-docker directories
    [ -f "${version}/${variant}/Dockerfile" ] || continue

    if [ "${variant}" = "onbuild" ]; then
      build "${version}" "${default_variant}" "$tag"
      test_image "${full_version}" "${default_variant}" "$tag"
    fi

    build "${version}" "${variant}" "${tag}"
    test_image "${full_version}" "${variant}" "${tag}"
  done

done

info "All builds successful!"

exit 0
