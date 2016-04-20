#!/usr/bin/env bash
#
# Run a test build for all images.

set -uo pipefail
IFS=$'\n\t'

info() {
  printf "%s\n" "$@"
}

fatal() {
  printf "**********\n"
  printf "%s\n" "$@"
  printf "**********\n"
  exit 1
}

cd $(cd ${0%/*} && pwd -P);

versions=( "$@" )
if [ ${#versions[@]} -eq 0 ]; then
  versions=( */ )
fi
versions=( "${versions[@]%/}" )

for version in "${versions[@]}"; do
  if [[ "$version" == "docs" ]]; then
    continue
  fi

  tag=$(cat $version/Dockerfile | grep "ENV NODE_VERSION" | cut -d' ' -f3)

  info "Building $tag..."
  docker build -q -t node:$tag $version

  if [[ $? -gt 0 ]]; then
    fatal "Build of $tag failed!"
  else
    info "Build of $tag succeeded."
  fi

  OUTPUT=$(docker run --rm -it node:$tag node -e "process.stdout.write(process.versions.node)")
  if [ "$OUTPUT" != "$tag" ]; then
    fatal "Test of $tag failed!"
  else
    info "Test of $tag succeeded."
  fi

  variants=$(ls -d $version/*/ | awk -F"/" '{print $2}')

  for variant in $variants; do
    info "Building $tag-$variant variant..."
    docker build -q -t node:$tag-$variant $version/$variant

    if [[ $? -gt 0 ]]; then
      fatal "Build of $tag-$variant failed!"
    else
      info "Build of $tag-$variant succeeded."
    fi

    OUTPUT=$(docker run --rm -it node:$tag-$variant node -e "process.stdout.write(process.versions.node)")
    if [ "$OUTPUT" != "$tag" ]; then
      fatal "Test of $tag-$variant failed!"
    else
      info "Test of $tag-$variant succeeded."
    fi

  done

done

info "All builds successful!"

exit 0
