#!/usr/bin/env bash
#
# Run a test build for all images.

set -uo pipefail

. functions.sh

cd "$(cd "${0%/*}" && pwd -P)" || exit;

IFS=' ' read -ra versions <<< "$(get_versions . "$@")"
if [ ${#versions[@]} -eq 0 ]; then
  fatal "No valid versions found!"
fi

for version in "${versions[@]}"; do
  # Skip "docs" and other non-docker directories
  [ -f "$version/Dockerfile" ] || continue

  tag=$(get_tag "$version")
  full_version=$(get_full_version "$version")

  info "Building $tag..."

  if ! docker build -t node:"$tag" "$version"; then
    fatal "Build of $tag failed!"
  fi
  info "Build of $tag succeeded."

  OUTPUT=$(docker run --rm -it node:"$tag" node -e "process.stdout.write(process.versions.node)")
  if [ "$OUTPUT" != "$full_version" ]; then
    fatal "Test of $tag failed!"
  fi
  info "Test of $tag succeeded."

  # Get supported variants according to the target architecture.
  # See details in function.sh
  variants=$(get_variants "$(dirname "$version")")

  for variant in $variants; do
    # Skip non-docker directories
    [ -f "$version/$variant/Dockerfile" ] || continue

    info "Building $tag-$variant variant..."

    if ! docker build -t node:"$tag-$variant" "$version/$variant"; then
      fatal "Build of $tag-$variant failed!"
    fi
    info "Build of $tag-$variant succeeded."

    OUTPUT=$(docker run --rm -it node:"$tag-$variant" node -e "process.stdout.write(process.versions.node)")
    if [ "$OUTPUT" != "$full_version" ]; then
      fatal "Test of $tag-$variant failed!"
    fi
    info "Test of $tag-$variant succeeded."

  done

done

info "All builds successful!"

exit 0
