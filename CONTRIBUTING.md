# Contributing to docker-node

Thank you for your contribution. Here are a set of guidelines for contributing to the docker-node project.

## Version Updates

New **Node.js** releases are released as soon as possible.

New **NPM** releases are not tracked. We simply use the NPM version bundled in the corresponding Node.js release.

**Yarn** is updated to the latest version only when there is a new Node.js SemVer PATCH release (unless Yarn has received a security update), and it's updated only in the branch with the new release, preferably in the same PR. The `update.sh` script does this automatically when invoked with a specific branch, e.g. `./update.sh 6.10`.

### Image Creation Automation

- Every 15 minutes, the [workflow](https://github.com/nodejs/docker-node/blob/main/.github/workflows/automatic-updates.yml) within the [nodejs/docker-node](https://github.com/nodejs/docker-node) repo [checks](https://github.com/nodejs/docker-node/blob/main/build-automation.mjs) for new versions of Node.js [published to the website's `index.json` file](https://nodejs.org/download/release/index.json).
  - If found, it also checks for an [unofficial musl/Alpline build](https://unofficial-builds.nodejs.org/download/release/index.json).
  - If found, the [update script](https://github.com/nodejs/docker-node/blob/main/update.sh) runs
  - The workflow opens a pull request is opened either by [nodejs-github-bot](https://github.com/nodejs-github-bot). In some cases, this PR is manually created, such as new major releases.
- Another [workflow](https://github.com/nodejs/docker-node/blob/main/.github/workflows/official-pr.yml) detects the merger of these pull requests and opens a pull request to [docker-library/official-images](https://github.com/docker-library/official-images).
- The official images are built and published according to [docker's process](https://github.com/docker-library/faq#an-images-source-changed-in-git-now-what), resulting in the new images being available on [Docker Hub](https://hub.docker.com/_/node).

### Submitting a PR for a version update

If you'd like to help us by submitting a PR for a version update, please do the following:

1. [Fork this project.](https://docs.github.com/en/get-started/quickstart/fork-a-repo)
1. [Clone the forked repository.](https://docs.github.com/en/github/creating-cloning-and-archiving-repositories/cloning-a-repository)
1. Create a branch for the update PR. For example, `git checkout main; git checkout -b version-update`.
1. Run `./update.sh`. You can see additional options by using accessing the built-in help documentation with `./update.sh -h`. This script will automatically update the appropriate files with the latest versions and checksums.
1. Commit the modified files to the `version-update` branch and push the branch to your fork.
1. [Create a PR to merge the branch from your fork into this project's default branch.](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork).

## Adding dependencies to the base images

NodeJS is a big ecosystem with a variety of different use cases. The docker images for node are designed to provide the minimum for running core node.  Additional dependencies (including dependencies for npm or yarn such as git) will not be included in these base images and will need to be included in descendent image.
