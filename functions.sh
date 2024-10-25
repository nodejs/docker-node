#!/usr/bin/env bash
#
# Utlity functions
# Don't change this file unless needed
# The GitHub Action for automating new builds rely on this file

info() {
  printf "%s\\n" "$@"
}

fatal() {
  printf "**********\\n"
  printf "Fatal Error: %s\\n" "$@"
  printf "**********\\n"
  exit 1
}

# Get system architecture
#
# This is used to get the target architecture for docker image.
# For crossing building, we need a way to specify the target
# architecutre manually.
function get_arch() {
  local arch
  case $(uname -m) in
    x86_64)
      arch="amd64"
      ;;
    ppc64le)
      arch="ppc64le"
      ;;
    s390x)
      arch="s390x"
      ;;
    aarch64 | arm64)
      arch="arm64"
      ;;
    armv7l)
      arch="arm32v7"
      ;;
    *)
      echo "$0 does not support architecture ${arch:-unknown} ... aborting"
      exit 1
      ;;
  esac

  echo "${arch}"
}

# Get corresponding variants based on the architecture.
# All supported variants of each supported architecture are listed in a
# file - 'architectures'. Its format is:
#   <architecture 1> <supported variant 1 >,<supported variant 2>...
#   <architecture 2> <supported variant 1 >,<supported variant 2>...
function get_variants() {
  local dir
  dir=${1:-.}
  shift

  local arch
  local availablevariants
  local variantsfilter
  local variants=()

  arch=$(get_arch)
  variantsfilter=("$@")
  IFS=' ' read -ra availablevariants <<< "$(grep "^${arch}" "${dir}/architectures" | sed -E 's/'"${arch}"'[[:space:]]*//' | sed -E 's/,/ /g')"

  if [ ${#variantsfilter[@]} -gt 0 ]; then
    for variant1 in "${availablevariants[@]}"; do
      for variant2 in "${variantsfilter[@]}"; do
        if [ "${variant1}" = "${variant2}" ]; then
          variants+=("${variant1}")
        fi
      done
    done

    if [ ${#variants[@]} -gt 0 ]; then
      echo "${variants[@]}"
    fi
  else
    echo "${availablevariants[@]}"
  fi
}

# Get supported architectures for a specific version and variant
#
# Get default supported architectures from 'architectures'. Then go to the version folder
# to see if there is a local architectures file. The local architectures will override the
# default architectures. This will give us some benefits:
# - a specific version may or may not support some architectures
# - if there is no specialization for a version, just don't provide local architectures
function get_supported_arches() {
  local version
  local variant
  local arches
  local lines
  local line
  version="$1"
  shift
  variant="$1"
  shift

  # Get default supported arches
  lines=$(grep "${variant}" "$(dirname "${version}")"/architectures 2> /dev/null | cut -d' ' -f1)

  # Get version specific supported architectures if there is specialized information
  if [ -a "${version}"/architectures ]; then
    lines=$(grep "${variant}" "${version}"/architectures 2> /dev/null | cut -d' ' -f1)
  fi

  while IFS='' read -r line; do
    arches+=("${line}")
  done <<< "${lines}"

  echo "${arches[@]}"
}

# Get configuration values from the config file
#
# The configuration entries are simple key/value pairs which are whitespace separated.
function get_config() {
  local dir
  dir=${1:-.}
  shift

  local name
  name=${1}
  shift

  local value
  value=$(grep "^${name}" "${dir}/config" | sed -E 's/'"${name}"'[[:space:]]*//')
  echo "${value}"
}

# Get available versions for a given path
#
# The result is a list of valid versions.
# shellcheck disable=SC2120
function get_versions() {
  shift

  local versions=()
  local dirs=("$@")

  local default_variant
  default_variant=$(get_config "./" "default_variant")
  if [ ${#dirs[@]} -eq 0 ]; then
    IFS=' ' read -ra dirs <<< "$(echo "./"*/)"
  fi

  for dir in "${dirs[@]}"; do
    if [ -a "${dir}/Dockerfile" ] || [ -a "${dir}/${default_variant}/Dockerfile" ]; then
      versions+=("${dir#./}")
    fi
  done

  if [ ${#versions[@]} -gt 0 ]; then
    echo "${versions[@]%/}"
  fi
}

function is_alpine() {
  local variant
  variant=${1}
  shift

  if [ "${variant}" = "${variant#alpine}" ]; then
    return 1
  fi
}

function is_debian() {
  local variant
  variant=$1
  shift

  IFS=' ' read -ra debianVersions <<< "$(get_config "./" "debian_versions")"
  for d in "${debianVersions[@]}"; do
    if [ "${d}" = "${variant}" ]; then
      return 0
    fi
  done
  return 1
}

function is_debian_slim() {
  local variant
  variant=$1
  shift

  IFS=' ' read -ra debianVersions <<< "$(get_config "./" "debian_versions")"
  for d in "${debianVersions[@]}"; do
    if [ "${d}-slim" = "${variant}" ]; then
      return 0
    fi
  done
  return 1
}

function get_fork_name() {
  local version
  version=$1
  shift

  IFS='/' read -ra versionparts <<< "${version}"
  if [ ${#versionparts[@]} -gt 1 ]; then
    echo "${versionparts[0]}"
  fi
}

function get_full_tag() {
  local variant
  local tag
  local full_tag
  variant="$1"
  shift
  tag="$1"
  shift
  if [ -z "${variant}" ]; then
    full_tag="${tag}"
  elif [ "${variant}" = "default" ]; then
    full_tag="${tag}"
  else
    full_tag="${tag}-${variant}"
  fi
  echo "${full_tag}"
}

function get_full_version() {
  local version
  version=$1
  shift

  local default_dockerfile
  if [ -f "${version}/${default_variant}/Dockerfile" ]; then
    default_dockerfile="${version}/${default_variant}/Dockerfile"
  else
    default_dockerfile="${version}/Dockerfile"
  fi

  grep -m1 'ENV NODE_VERSION ' "${default_dockerfile}" | cut -d' ' -f3
}

function get_major_minor_version() {
  local version
  version=$1
  shift

  local fullversion
  fullversion=$(get_full_version "${version}")

  echo "$(echo "${fullversion}" | cut -d'.' -f1).$(echo "${fullversion}" | cut -d'.' -f2)"
}

function get_path() {
  local version
  local variant
  local path
  version="$1"
  shift
  variant="$1"
  shift

  if [ -z "${variant}" ]; then
    path="${version}/${variant}"
  elif [ "${variant}" = "default" ]; then
    path="${version}"
  else
    path="${version}/${variant}"
  fi
  echo "${path}"
}

function get_tag() {
  local version
  version=$1
  shift

  local versiontype
  versiontype=${1:-full}
  shift

  local tagversion
  if [ "${versiontype}" = full ]; then
    tagversion=$(get_full_version "${version}")
  elif [ "${versiontype}" = majorminor ]; then
    tagversion=$(get_major_minor_version "${version}")
  fi

  local tagparts
  IFS=' ' read -ra tagparts <<< "$(get_fork_name "${version}") ${tagversion}"
  IFS='-'
  echo "${tagparts[*]}"
  unset IFS
}

function sort_versions() {
  local versions=("$@")
  local sorted
  local lines
  local line

  IFS=$'\n'
  lines="${versions[*]}"
  unset IFS

  while IFS='' read -r line; do
    sorted+=("${line}")
  done <<< "$(echo "${lines}" | grep "^[0-9]" | sort -r)"

  while IFS='' read -r line; do
    sorted+=("${line}")
  done <<< "$(echo "${lines}" | grep -v "^[0-9]" | sort -r)"

  echo "${sorted[@]}"
}

function commit_range() {
  local commit_id_end=${1}
  shift
  local commit_id_start=${1}

  if [ -z "${commit_id_start}" ]; then
    if [ -z "${commit_id_end}" ]; then
      echo "HEAD~1..HEAD"
    elif [[ "${commit_id_end}" =~ .. ]]; then
      echo "${commit_id_end}"
    else
      echo "${commit_id_end}~1..${commit_id_end}"
    fi
  else
    echo "${commit_id_end}..${commit_id_start}"
  fi
}

function images_updated() {
  local commit_range
  local versions
  local images_changed

  commit_range="$(commit_range "$@")"

  IFS=' ' read -ra versions <<< "$(
    IFS=','
    get_versions
  )"
  images_changed=$(git diff --name-only "${commit_range}" "${versions[@]}")

  if [ -z "${images_changed}" ]; then
    return 1
  fi
  return 0
}

function tests_updated() {
  local commit_range
  local test_changed

  commit_range="$(commit_range "$@")"

  test_changed=$(git diff --name-only "${commit_range}" test*)

  if [ -z "${test_changed}" ]; then
    return 1
  fi
  return 0
}
