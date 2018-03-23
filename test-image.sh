#!/bin/sh
if [ "$(node -e "process.stdout.write(process.versions.node)")" != "$1" ]; then
	echo "Test for node failed!"
	exit 1
fi
echo "Test for node succeeded."

if ! npm --version > /dev/null; then
	echo "Test for npm failed!"
	exit 2
fi
echo "Test for npm succeeded."

if ! yarn --version > /dev/null; then
	echo "Test of yarn failed!"
	exit 3
fi
echo "Test for yarn succeeded."
