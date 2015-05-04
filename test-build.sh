#!/usr/bin/env bash
#
# Run a test build for all images.

set -uo pipefail
IFS=$'\n\t'

DOCKERFILES=$(find . -name Dockerfile)

info() {
  printf "%s\n" "$@"
}

fatal() {
  printf "**********\n"
  printf "%s\n" "$@"
  printf "**********\n"
  exit 1
}

for DOCKERFILE in $DOCKERFILES ; do
  TAG=$(echo $DOCKERFILE | sed 's/Dockerfile//g')
  info "=========="
  info "Building $TAG..."
  docker build -q $TAG
  if [[ $? -gt 0 ]]; then
    fatal "Build of $TAG failed!"
  else
    info "Build of $TAG succeeded"
  fi
done

info "All builds successful!"
info "Dockerfiles:"
info "$DOCKERFILES"

exit 0
