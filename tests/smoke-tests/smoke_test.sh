#!/usr/bin/env bash
# =============================================================================
#
# smoke_test.sh
#
# This script clones down a set of popular npm packages and runs their unit
# tests. This can be used to help verify a stable Node and npm install.
#
# =============================================================================

# Exit on failure
set -e

# Define a set of tuples that are used to clone npm projects for testing
# Note: Bash doesn't suppor tuples, so we have 4 arrays.
REPOS=(
  "https://github.com/caolan/async"
  "https://github.com/tj/commander.js"
  "https://github.com/substack/node-mkdirp"
  "https://github.com/rvagg/through2"
  "https://github.com/isaacs/node-glob"
  "https://github.com/broofa/node-uuid"
  "https://github.com/cheeriojs/cheerio"
  "https://github.com/kriskowal/q"
)

BRANCHES=(
  "2.x"
  "master"
  "master"
  "master"
  "master"
  "master"
  "master"
  "v1"
)

DIRS=(
  "async"
  "commander"
  "mkdirp"
  "through2"
  "glob"
  "uuid"
  "cheerio"
  "q"
)

TESTS=(
  "nodeunit-test"
  "test"
  "test"
  "test"
  "test"
  "test"
  "test"
  "test"
)

# Keep track of where we started before we cd around
CWD=$PWD

# Iterate through all tuples in the set defined above
for i in `seq 3 $(expr ${#REPOS[@]} - 1)`; do
  # Break tuple apart into components
  REPO=${REPOS[$i]}
  BRANCH=${BRANCHES[$i]}
  DIR=${DIRS[$i]}
  TEST=${TESTS[$i]}

  # Clone an npm package from github, install its deps, and then test it.
  echo "--> Cloning $DIR"
  git clone --recursive --depth 1 --branch $BRANCH $REPO $DIR
  cd $DIR
  echo "--> Setting up $DIR"
  npm install
  echo "--> Testing $DIR"
  # Only log error if tests fail
  log=$(npm run "$TEST" 2>&1)
  if [ $? -ne 0 ]; then
    echo -e "$log"
  fi
  cd $CWD
done
