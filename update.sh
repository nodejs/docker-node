#!/usr/bin/env bash

set -ue

function usage() {
  cat << EOF

  Update the node docker images.

  Usage:
    $0 [-s] [MAJOR_VERSION(S)] [VARIANT(S)]

  Examples:
    - update.sh                      # Update all images
    - update.sh -s                   # Update all images, skip updating Alpine and Yarn
    - update.sh 8,10                 # Update all variants of version 8 and 10
    - update.sh -s 8                 # Update version 8 and variants, skip updating Alpine and Yarn
    - update.sh 8 alpine             # Update only alpine's variants for version 8
    - update.sh -s 8 bullseye        # Update only bullseye variant for version 8, skip updating Alpine and Yarn
    - update.sh . alpine             # Update the alpine variant for all versions

  OPTIONS:
    -s Security update; skip updating the yarn and alpine versions.
    -b CI config update only
    -h Show this message

EOF
}

SKIP=false
while getopts "sh" opt; do
  case "${opt}" in
    s)
      SKIP=true
      shift
      ;;
    h)
      usage
      exit
      ;;
    \?)
      usage
      exit
      ;;
  esac
done

. functions.sh

cd "$(cd "${0%/*}" && pwd -P)"

IFS=',' read -ra versions_arg <<< "${1:-}"
IFS=',' read -ra variant_arg <<< "${2:-}"

IFS=' ' read -ra versions <<< "$(get_versions .)"
IFS=' ' read -ra update_versions <<< "$(get_versions . "${versions_arg[@]:-}")"
IFS=' ' read -ra update_variants <<< "$(get_variants . "${variant_arg[@]:-}")"
if [ ${#versions[@]} -eq 0 ]; then
  fatal "No valid versions found!"
fi

# Global variables
# Get architecure and use this as target architecture for docker image
# See details in function.sh
# TODO: Should be able to specify target architecture manually
arch=$(get_arch)

if [ "${SKIP}" != true ]; then
  alpine_version=$(get_config "./" "alpine_version")
  yarnVersion="$(curl -sSL --compressed https://yarnpkg.com/latest-version)"
fi

function in_versions_to_update() {
  local version=$1

  if [ "${#update_versions[@]}" -eq 0 ]; then
    echo 0
    return
  fi

  for version_to_update in "${update_versions[@]}"; do
    if [ "${version_to_update}" = "${version}" ]; then
      echo 0
      return
    fi
  done

  echo 1
}

function in_variants_to_update() {
  local variant=$1

  if [ "${#update_variants[@]}" -eq 0 ]; then
    echo 0
    return
  fi

  for variant_to_update in "${update_variants[@]}"; do
    if [ "${variant_to_update}" = "${variant}" ]; then
      echo 0
      return
    fi
  done

  echo 1
}

function update_node_version() {

  local baseuri=${1}
  shift
  local version=${1}
  shift
  local template=${1}
  shift
  local dockerfile=${1}
  shift
  local variant=""
  if [ $# -eq 1 ]; then
    variant=${1}
    shift
  fi

  fullVersion="$(curl -sSL --compressed "${baseuri}" | grep '<a href="v'"${version}." | sed -E 's!.*<a href="v([^"/]+)/?".*!\1!' | cut -d'.' -f2,3 | sort -V | tail -1)"
  (
    cp "${template}" "${dockerfile}-tmp"
    local fromprefix=""
    if [ "${arch}" != "amd64" ] && [ "${arch}" != "arm64" ]; then
      fromprefix="${arch}\\/"
    fi

    nodeVersion="${version}.${fullVersion:-0}"

    sed -Ei -e 's/^FROM (.*)/FROM '"$fromprefix"'\1/' "${dockerfile}-tmp"
    sed -Ei -e 's/^(ENV NODE_VERSION ).*/\1'"${nodeVersion}"'/' "${dockerfile}-tmp"

    currentYarnVersion="$(grep "ENV YARN_VERSION" "${dockerfile}" | cut -d' ' -f3)"
    sed -Ei -e 's/^(ENV YARN_VERSION ).*/\1'"${currentYarnVersion}"'/' "${dockerfile}-tmp"

    # shellcheck disable=SC1004
    new_line=' \\\
'

    # Add GPG keys
    for key_type in "node" "yarn"; do
      while read -r line; do
        pattern='"\$\{'$(echo "${key_type}" | tr '[:lower:]' '[:upper:]')'_KEYS\[@\]\}"'
        sed -Ei -e "s/([ \\t]*)(${pattern})/\\1${line}${new_line}\\1\\2/" "${dockerfile}-tmp"
      done < "keys/${key_type}.keys"
      sed -Ei -e "/${pattern}/d" "${dockerfile}-tmp"
    done

    if is_alpine "${variant}"; then
      alpine_version="${variant#*alpine}"
      checksum=$(
        curl -sSL --compressed "https://unofficial-builds.nodejs.org/download/release/v${nodeVersion}/SHASUMS256.txt" | grep "node-v${nodeVersion}-linux-x64-musl.tar.xz" | cut -d' ' -f1
      )
      if [ -z "$checksum" ]; then
        rm -f "${dockerfile}-tmp"
        fatal "Failed to fetch checksum for version ${nodeVersion}"
      fi
      sed -Ei -e "s/(alpine:)0.0/\\1${alpine_version}/" "${dockerfile}-tmp"
      sed -Ei -e "s/CHECKSUM=CHECKSUM_x64/CHECKSUM=\"${checksum}\"/" "${dockerfile}-tmp"

    elif is_debian "${variant}"; then
      sed -Ei -e "s/(buildpack-deps:)name/\\1${variant}/" "${dockerfile}-tmp"
    elif is_debian_slim "${variant}"; then
      sed -Ei -e "s/(debian:)name-slim/\\1${variant}/" "${dockerfile}-tmp"
    fi

    if diff -q "${dockerfile}-tmp" "${dockerfile}" > /dev/null; then
      echo "${dockerfile} is already up to date!"
    else
      if [ "${SKIP}" = true ]; then
        # Get the currently used Yarn version
        yarnVersion="$(grep "ENV YARN_VERSION" "${dockerfile}" | cut -d' ' -f3)"
      fi
      sed -Ei -e 's/^(ENV YARN_VERSION ).*/\1'"${yarnVersion}"'/' "${dockerfile}-tmp"
      echo "${dockerfile} updated!"
    fi

    # Required for POSIX sed
    if [ -f "${dockerfile}-tmp-e" ]; then
      rm "${dockerfile}-tmp-e"
    fi

    mv -f "${dockerfile}-tmp" "${dockerfile}"
  )
}

pids=()

for version in "${versions[@]}"; do
  parentpath=$(dirname "${version}")
  versionnum=$(basename "${version}")
  baseuri=$(get_config "${parentpath}" "baseuri")
  update_version=$(in_versions_to_update "${version}")

  [ "${update_version}" -eq 0 ] && info "Updating version ${version}..."

  # Get supported variants according the target architecture
  # See details in function.sh
  IFS=' ' read -ra variants <<< "$(get_variants "${parentpath}")"

  if [ -f "${version}/Dockerfile" ]; then
    if [ "${update_version}" -eq 0 ]; then
      update_node_version "${baseuri}" "${versionnum}" "${parentpath}/Dockerfile.template" "${version}/Dockerfile" &
      pids+=($!)
    fi
  fi

  for variant in "${variants[@]}"; do
    # Skip non-docker directories
    [ -f "${version}/${variant}/Dockerfile" ] || continue

    update_variant=$(in_variants_to_update "${variant}")
    template_file="${parentpath}/Dockerfile-${variant}.template"

    if is_debian "${variant}"; then
      template_file="${parentpath}/Dockerfile-debian.template"
    elif is_debian_slim "${variant}"; then
      template_file="${parentpath}/Dockerfile-slim.template"
    elif is_alpine "${variant}"; then
      template_file="${parentpath}/Dockerfile-alpine.template"
    fi

    cp "${parentpath}/docker-entrypoint.sh" "${version}/${variant}/docker-entrypoint.sh"
    if [ "${update_version}" -eq 0 ] && [ "${update_variant}" -eq 0 ]; then
      update_node_version "${baseuri}" "${versionnum}" "${template_file}" "${version}/${variant}/Dockerfile" "${variant}" &
      pids+=($!)
    fi
  done
done

# The reason we explicitly wait on each pid is so the return status of this script is set properly
# if one of the jobs fails. If we just called "wait", the exit status would always be 0
for pid in "${pids[@]}"; do
  wait "$pid"
done

info "Done!"
