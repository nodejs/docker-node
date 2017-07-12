# Contributing to docker-node

Thank you for your contribution. Here are a set of guidelines for contributing to the docker-node project.

## Version Updates

New **Node.js** releases are released as soon as possible.

New **NPM** releases are not tracked. We simply use the NPM version bundled in the corresponding Node.js release.

**Yarn** is updated to the latest version only when there is a new Node.js SemVer PATCH release, and it's updated only in the branch with the new release, preferably in the same PR. The `update.sh` script does this automatically when invoked with a specific branch, e.g. `./update.sh 6.10`.

## Adding dependencies to the base images

NodeJS is a big ecosystem with a variety of different use cases. The docker images for node are designed to provide the minimum for running core node.  Additional dependencies (including dependencies for npm or yarn such as git) will not be included in these base images and will need to be included in descendent image.
