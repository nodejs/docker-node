#!/usr/bin/env bash
#
# Run a test build for all images.

set -euo pipefail

. functions.sh

# Convert comma delimited cli arguments to arrays
# E.g. ./test-build.sh 10,12 slim,alpine
# "10,12" becomes "10 12" and "slim,alpine" becomes "slim alpine"
IFS=',' read -ra versions_arg <<< "${1:-}"
IFS=',' read -ra variant_arg <<< "${2:-}"
IFS=',' read -ra arches_arg <<< "${3:-}"

default_variant=$(get_config "./" "default_variant")

function build() {
  local version
  local tag
  local variant
  local platform
  local full_tag
  local path
  version="$1"
  shift
  variant="$1"
  shift
  tag="$1"
  shift
  platform="$1"
  shift

  full_tag=$(get_full_tag "${variant}" "${tag}")
  path=$(get_path "${version}" "${variant}")

  info "Building ${full_tag} on ${platform}..."

  if ! docker buildx build --load --platform "${platform}" -t node:"${full_tag}" "${path}"; then
    fatal "Build of ${full_tag} failed!"
  fi
  info "Build of ${full_tag} succeeded."
}

function test_image() {
  local full_version
  local variant
  local platform
  local tag
  local full_tag
  full_version="$1"
  shift
  variant="$1"
  shift
  tag="$1"
  shift
  platform="$1"
  shift

  full_tag=$(get_full_tag "${variant}" "${tag}")

  info "Testing ${full_tag} on ${platform}"
  (
    export full_version=${full_version}
    export full_tag=${full_tag}
    export platform=${platform}
    bats test-image.bats
  )
}

cd "$(cd "${0%/*}" && pwd -P)" || exit

for version in "${versions_arg[@]}"; do
  # Skip "docs" and other non-docker directories
  [ -f "${version}/Dockerfile" ] || [ -a "${version}/${default_variant}/Dockerfile" ] || continue

  tag=$(get_tag "${version}")
  full_version=$(get_full_version "${version}")

  # Get supported variants according to the target architecture.
  # See details in function.sh
  IFS=' ' read -ra variants <<< "$(get_variants "$(dirname "${version}")" "${variant_arg[@]}")"

  for variant in "${variants[@]}"; do
    # Skip non-docker directories
    [ -f "${version}/${variant}/Dockerfile" ] || continue

    for arch in "${arches_arg[@]}"; do
      buildx_platform=$(arch_to_buildx_platform "${arch}")

      build "${version}" "${variant}" "${tag}" "linux/${buildx_platform}"
      test_image "${full_version}" "${variant}" "${tag}" "linux/${buildx_platform}"
    done

  done

done

info "All builds successful!"

exit 0
