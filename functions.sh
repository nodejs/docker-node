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
		arch="x64"
		;;
	ppc64le)
		arch="ppc64le"
		;;
	s390x)
		arch="s390x"
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
	variants=$(grep "$arch" architectures | sed -E 's/'"$arch"'\s*//' | sed -E 's/,/ /g')
	echo "$variants"
}
