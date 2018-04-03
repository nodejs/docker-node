#!/usr/bin/env bash
#
# Run a test build for all images.

set -uo pipefail

. functions.sh

function build () {
  local version
  local tag
  local variant
  local full_tag
  local path
  version="$1"; shift
  variant="$1"; shift
  tag="$1"; shift

  if [ -z "$variant" ]; then
    full_tag="$tag"
    path="$version/$variant"
  else
    full_tag="$tag-$variant"
    path="$version/$variant"
  fi
  export path

  info "Building $full_tag..."

  #if ! docker build -t node:"$full_tag" "$path"; then
  #  fatal "Build of $full_tag failed!"
  #fi
  info "Build of $full_tag succeeded."

  info "Testing $full_tag"
  #docker run --rm -v "$PWD/test-image.sh:/usr/local/bin/test.sh" node:"$full_tag" test.sh "$full_version"
}

cd "$(cd "${0%/*}" && pwd -P)" || exit;

IFS=' ' read -ra versions <<< "$(IFS=','; get_versions . "$1")"
if [ ${#versions[@]} -eq 0 ]; then
  fatal "No valid versions found!"
fi

for version in "${versions[@]}"; do
  # Skip "docs" and other non-docker directories
  [ -f "$version/Dockerfile" ] || continue

  tag=$(get_tag "$version")
  #full_version=$(get_full_version "$version")

  build "$version" "" "$tag"

  # Get supported variants according to the target architecture.
  # See details in function.sh
  IFS=' ' read -ra variants <<< "$(IFS=','; get_variants "$(dirname "$version")" "$2")"

  for variant in "${variants[@]}"; do
    # Skip non-docker directories
    [ -f "$version/$variant/Dockerfile" ] || continue

    build "$version" "$variant" "$tag"
  done

done

info "All builds successful!"

exit 0
