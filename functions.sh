#!/bin/bash

# Utlity functions

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
	aarch64)
		arch="arm64"
		;;
	armv7l)
		arch="arm32v7"
		;;
	*)
		echo "$0 does not support architecture $arch ... aborting"
		exit 1
		;;
	esac

	echo "$arch"
}

# Get corresponding variants based on the architecture.
# All supported variants of each supported architecutre are listed in a
# file - 'architectures'. Its format is:
#   <architecutre 1> <supported variant 1 >,<supported variant 2>...
#   <architecutre 2> <supported variant 1 >,<supported variant 2>...
function get_variants() {
	local dir
	dir=${1:-.}
	shift

	local arch
	arch=$(get_arch)
	local variants
	variants=$(grep "^$arch" "$dir/architectures" | sed -E 's/'"$arch"'[[:space:]]*//' | sed -E 's/,/ /g')
	echo "$variants"
}

# Get supported architectures for a specific version and variant
#
# Get default supported architectures from 'architectures'. Then go to the version folder
# to see if there is a local architectures file. The local architectures will override the
# default architectures. This will give us some benefits:
# - a specific version may or may not support some architectures
# - if there is no specialization for a version, just don't provide local architectures
function get_supported_arches () {
	local version
	local variant
	local arches
	local lines
	local line
	version="$1"; shift
	variant="$1"; shift

	# Get default supported arches
	lines=$( grep "$variant" "$(dirname "$version")"/architectures 2>/dev/null | cut -d' ' -f1 )

	# Get version specific supported architectures if there is specialized information
	if [ -a "$version"/architectures ]; then
		lines=$( grep "$variant" "$version"/architectures 2>/dev/null | cut -d' ' -f1 )
	fi

	while IFS='' read -r line; do
		arches+=( "$line" )
	done <<< "$lines"

	echo "${arches[@]}"
}

# Get configuration values from the config file
#
# The configuration entries are simple key/value pairs which are whitespace separated.
function get_config () {
	local dir
	dir=${1:-.}
	shift

	local name
	name=$1
	shift

	local value
	value=$(grep "^$name" "$dir/config" | sed -E 's/'"$name"'[[:space:]]*//')
	echo "$value"
}

# Get available versions for a given path
#
# If full or partial versions are provided then they are processed and
# validated. e.g. "4 chakracore" returns "4 chakracore/8" since it processed the
# chakracore entry and found it to be a fork rather than a complete version.
#
# The result is a list of valid versions.
function get_versions () {
	local prefix
	prefix=${1:-.}
	shift

	local versions
	local dirs=( "$@" )
	if [ ${#dirs[@]} -eq 0 ]; then
		IFS=' ' read -ra dirs <<< "$(echo "${prefix%/}/"*/)"
	fi

	for dir in "${dirs[@]}"; do
		if [ -a "$dir/config" ]; then
			local subdirs
			IFS=' ' read -ra subdirs <<< "$(get_versions "${dir#./}")"
			for subdir in "${subdirs[@]}"; do
				versions+=( "$subdir" )
			done
		elif [ -a "$dir/Dockerfile" ]; then
			versions+=( "${dir#./}" )
		fi
	done

	if [ ${#versions[@]} -gt 0 ]; then
		echo "${versions[@]%/}"
	fi
}

function get_fork_name () {
	local version
	version=$1
	shift

	IFS='/' read -ra versionparts <<< "$version"
	if [ ${#versionparts[@]} -gt 1 ]; then
		echo "${versionparts[0]}"
	fi
}

function get_full_version () {
	local version
	version=$1
	shift

	grep -m1 'ENV NODE_VERSION ' "$version/Dockerfile" | cut -d' ' -f3
}

function get_major_minor_version () {
	local version
	version=$1
	shift

	local fullversion
	fullversion=$(get_full_version "$version")

	echo "$(echo "$fullversion" | cut -d'.' -f1).$(echo "$fullversion" | cut -d'.' -f2)"
}

function get_tag () {
	local version
	version=$1
	shift

	local versiontype
	versiontype=${1:-full}
	shift

	local tagversion
	if [ "$versiontype" = full ]; then
		tagversion=$(get_full_version "$version")
	elif [ "$versiontype" = majorminor ]; then
		tagversion=$(get_major_minor_version "$version")
	fi

	local tagparts
	IFS=' ' read -ra tagparts <<< "$(get_fork_name "$version") $tagversion"
	IFS='-'; echo "${tagparts[*]}"; unset IFS
}

function sort_versions () {
	local versions=( "$@" )
	local sorted
	local lines
	local line
	
	IFS=$'\n'
	lines="${versions[*]}"
	unset IFS

	while IFS='' read -r line; do
		sorted+=( "$line" )
	done <<< "$(echo "$lines" | grep "^[0-9]" | sort -r)"

	while IFS='' read -r line; do
		sorted+=( "$line" )
	done <<< "$(echo "$lines" | grep -v "^[0-9]" | sort -r)"

	echo "${sorted[@]}"
}
