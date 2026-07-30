# Contributing to docker-node

Thank you for your contribution. Here are guidelines for contributing to the docker-node project.

<!-- prettier-ignore-start -->
<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Table of Contents

- [Governance and decision making](#governance-and-decision-making)
- [Discussion Areas](#discussion-areas)
- [Prerequisites](#prerequisites)
- [Pull requests](#pull-requests)
- [Linting](#linting)
- [Link checks](#link-checks)
- [Version Updates](#version-updates)
  - [Image Creation Automation](#image-creation-automation)
  - [Image Creation Manually](#image-creation-manually)
- [Adding dependencies to the base images](#adding-dependencies-to-the-base-images)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->
<!-- prettier-ignore-end -->

## Governance and decision making

Project governance uses consensus seeking. See [GOVERNANCE.md](./GOVERNANCE.md) for
roles and the decision process.

For governance-sensitive or potentially contentious changes, open a PR (or issue)
with rationale and allow time for async feedback.

If a final decision cannot be reached via consensus seeking, escalation goes to
the Node.js TSC as final arbiter.

## Discussion Areas

<!-- markdown-link-check-disable -->

You can use Node.js channels (prefixed by `#nodejs-`) in the [OpenJSF Slack](https://slack-invite.openjsf.org/) workspace for discussions.
<!-- markdown-link-check-enable -->

- [#nodejs-distributions](https://openjs-foundation.slack.com/archives/C0ALS3UDE8G) covers discussions for this repo (`docker-node`).

- [#nodejs-release](https://openjs-foundation.slack.com/archives/C019MGJQ8RH) is linked to the [Node.js Release Working Group](https://github.com/nodejs/release#readme) responsible for the upstream releases of Node.js used by this repo.

## Prerequisites

To contribute to this repo, install:

- [git](https://git-scm.com/)
- [Docker](https://docs.docker.com/get-started/get-docker/)
- [Node.js](https://nodejs.org/en/download) LTS version as specified in [.node-version](./.node-version)

[fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo) and [clone](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) this repo, then install npm dependencies.
Replace `<my-github-username>` with the username of your fork in the instructions below:

```shell
git clone https://github.com/<my-github-username>/docker-node
cd docker-node
git remote add upstream https://github.com/nodejs/docker-node
git remote update
npm ci # install npm dependencies
```

## Pull requests

Contributions are handled through GitHub pull requests. Branch from the default branch `main` and create a new branch, for example:

```shell
git checkout main
git checkout -b my-branch
```

Make changes in your branch and then submit your contribution as a [pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork) (PR), targeting the branch `main`.

## Linting

After making changes, execute the following to check for correct formatting.
This runs the linting scripts `format:toc:check` and `format:prettier:check`.

```shell
npm run lint
```

To fix any linting issues that are automatically fixable, execute:

```shell
npm run lint:fix
```

Alternatively use any of the following commands to call one of the underlying linting utilities:

| Command                         | Purpose                                 |
| ------------------------------- | --------------------------------------- |
| `npm run format:toc`            | Reformats any Table of Contents         |
| `npm run format:toc:check`      | Read-only Table of Contents check       |
| `npm run format:prettier`       | Reformats multiple types of source code |
| `npm run format:prettier:check` | Read-only prettier check                |

## Link checks

Execute the following to check links in Markdown files:

```shell
npm run check:markdown-links
```

If you are running on Microsoft Windows, run the above command in a Git Bash terminal window.
[Git for Windows](https://gitforwindows.org/) includes Git Bash.

## Version Updates

New **Node.js** releases are released as soon as possible.

New **npm** releases are not tracked. We simply use the npm version bundled in the corresponding Node.js release.

**[Yarn v1 Classic](https://classic.yarnpkg.com/)** is no longer maintained upstream, and it is removed when constructing Dockerfiles
from templates starting with the Node 26 images.

**[Alpine Linux](https://alpinelinux.org/releases/)** latest two releases are used.
When Alpine Linux makes a new branch available, which is planned for May and November each year,
this branch is adopted as a new base image and it becomes the default
for each supported Node.js release line.
The lowest previously used Alpine Linux release is dropped for future image builds,
so that only the two latest releases are maintained.

### Image Creation Automation

- Every 15 minutes, the [workflow](https://github.com/nodejs/docker-node/blob/main/.github/workflows/automatic-updates.yml) within the [nodejs/docker-node](https://github.com/nodejs/docker-node) repo [checks](https://github.com/nodejs/docker-node/blob/main/build-automation.mjs) for new versions of Node.js [published to the website's `index.json` file](https://nodejs.org/download/release/index.json).
  - If found, it also checks for an [unofficial musl/Alpine build](https://unofficial-builds.nodejs.org/download/release/index.json).
  - If found, the [update script](https://github.com/nodejs/docker-node/blob/main/update.sh) runs
  - The workflow opens a pull request either automatically via [nodejs-github-bot](https://github.com/nodejs-github-bot) or in some cases manually, such as when there is a new major release.
- Another [workflow](https://github.com/nodejs/docker-node/blob/main/.github/workflows/official-pr.yml) detects the merger of these pull requests and opens a pull request to [docker-library/official-images](https://github.com/docker-library/official-images).
- The official images are built and published according to [docker's process](https://github.com/docker-library/faq#an-images-source-changed-in-git-now-what), resulting in the new images being available on [Docker Hub](https://hub.docker.com/_/node).

### Image Creation Manually

Image updates for existing Node.js release lines are created automatically as described above.
If there is a problem with the automated process, it may be necessary to create an update PR manually.
If you believe there is a need for a manual PR, and you are not a member of the
[Docker Maintainers](./README.md#docker-maintainers) or
[Collaborators](./README.md#collaborators) team of this repo,
please first open an issue to describe the update problem
and your suggestion to resolve it.

To set up a version update pull request, see the [Pull Requests](#pull-requests) section above and follow these instructions:

1. Create a `version-update` branch
1. Run `./update.sh`. You can see additional options by using the built-in help documentation with `./update.sh -h`. This script will automatically update the appropriate files with the latest versions and checksums.
1. Commit the modified files to the `version-update` branch and push the branch to your fork.
1. Create a pull request.

When a new Node.js release line is expected, additional preparation is necessary, including updates to the
[versions.json](./versions.json) file and creation of a major version directory, populated with generated files.
This task is undertaken by members of the repo team above.

## Adding dependencies to the base images

NodeJS is a big ecosystem with a variety of different use cases. The docker images for node are designed to provide the minimum for running core node. Additional dependencies (including dependencies for npm or yarn such as git) will not be included in these base images and will need to be included in descendent image.
