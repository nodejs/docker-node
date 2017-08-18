#!/bin/bash

# Utlity functions

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
	    arch="armhf"
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
	local arch
	arch=$(get_arch)
	local variants
	variants=$(grep "^$arch" architectures | sed -E 's/'"$arch"'\s*//' | sed -E 's/,/ /g')
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
	version="$1"; shift
	variant="$1"; shift

	# Get default supported arches
	arches=$( grep "$variant" architectures 2>/dev/null | cut -d' ' -f1 )

	# Get version specific supported architectures if there is specialized information
	if [ -a "$version"/architectures ]; then
		arches=$( grep "$variant" "$version"/architectures 2>/dev/null | cut -d' ' -f1 )
	fi
	echo "$arches"
}
