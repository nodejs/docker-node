# Node.js

[**node - Docker Official Images on Docker Hub**](https://hub.docker.com/_/node)

[![GitHub issues](https://img.shields.io/github/issues/nodejs/docker-node.svg 'GitHub issues')](https://github.com/nodejs/docker-node)
[![GitHub stars](https://img.shields.io/github/stars/nodejs/docker-node.svg 'GitHub stars')](https://github.com/nodejs/docker-node)

The official Node.js docker image, made with love by the node community.

<!-- prettier-ignore-start -->
<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Table of Contents

- [What is Node.js?](#what-is-nodejs)
- [How to use this image](#how-to-use-this-image)
  - [Create a `Dockerfile` in your Node.js app project](#create-a-dockerfile-in-your-nodejs-app-project)
  - [Best Practices](#best-practices)
  - [Run a single Node.js script](#run-a-single-nodejs-script)
  - [npm loglevel](#npm-loglevel)
    - [Dockerfile](#dockerfile)
    - [Docker Run](#docker-run)
    - [npm run](#npm-run)
- [Image Variants](#image-variants)
  - [`node:<version>`](#nodeversion)
  - [`node:lts`](#nodelts)
  - [`node:alpine`](#nodealpine)
  - [`node:bullseye`](#nodebullseye)
  - [`node:bookworm`](#nodebookworm)
  - [`node:trixie`](#nodetrixie)
  - [`node:slim`](#nodeslim)
- [Long Term Support (LTS)](#long-term-support-lts)
- [Release Availability](#release-availability)
- [License](#license)
- [Supported Docker versions](#supported-docker-versions)
- [Supported Node.js versions](#supported-nodejs-versions)
- [Supported architectures](#supported-architectures)
  - [musl builds for Alpine](#musl-builds-for-alpine)
- [Yarn v1 Classic bundling](#yarn-v1-classic-bundling)
- [Governance and Current Members](#governance-and-current-members)
  - [Docker Maintainers](#docker-maintainers)
  - [Collaborators](#collaborators)
  - [Emeritus](#emeritus)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->
<!-- prettier-ignore-end -->

## What is Node.js?

Node.js is a platform built on Chrome's JavaScript runtime for easily building
fast, scalable network applications. Node.js uses an event-driven, non-blocking
I/O model that makes it lightweight and efficient, perfect for data-intensive
real-time applications that run across distributed devices.

See: https://nodejs.org

## How to use this image

### Create a `Dockerfile` in your Node.js app project

```dockerfile
# specify the node base image with your desired version node:<version>
FROM node:24
# replace this with your application's default port
EXPOSE 8888
```

You can then build and run the Docker image:

```console
$ docker build -t my-nodejs-app .
$ docker run -it --rm --name my-running-app my-nodejs-app
```

If you prefer Docker Compose:

```yml
services:
  node:
    image: 'node:24'
    user: 'node'
    working_dir: /home/node/app
    environment:
      - NODE_ENV=production
    volumes:
      - ./:/home/node/app
    ports: # use if it is necessary to expose the container to the host machine
      - '8888:8888'
    command: ['npm', 'start']
```

You can then run using Docker Compose:

```console
$ docker-compose up -d
```

Docker Compose example mounts your current directory (including node_modules) to the container.
It assumes that your application has a file named [`package.json`](https://docs.npmjs.com/files/package.json)
defining [start script](https://docs.npmjs.com/misc/scripts#default-values).

### Best Practices

We have assembled a [Best Practices Guide](./docs/BestPractices.md) for those using these images on a daily basis.

### Run a single Node.js script

For many simple, single file projects, you may find it inconvenient to write a
complete `Dockerfile`. In such cases, you can run a Node.js script by using the
Node.js Docker image directly:

```console
$ docker run -it --rm --name my-running-script -v "$PWD":/usr/src/app -w /usr/src/app node:24 node your-daemon-or-script.js
```

### npm loglevel

The default [npm loglevel](https://docs.npmjs.com/cli/using-npm/logging)
is `notice`, which includes also the levels `warn` and `error`.
If you need to set a different `loglevel` for npm, follow these example instructions:

#### Dockerfile

If you create your own `Dockerfile` which inherits from the `node` image, you can
use `ENV` to set the `NPM_CONFIG_LOGLEVEL` environment variable.

```dockerfile
FROM node:lts
ENV NPM_CONFIG_LOGLEVEL=info
...
```

#### Docker Run

If you run the node image using `docker run`, you can use the `-e` flag to
set the `NPM_CONFIG_LOGLEVEL` environment variable.

```console
$ docker run -e NPM_CONFIG_LOGLEVEL=info node:lts ...
```

#### npm run

If you are running npm commands, you can use the `--loglevel` command line flag
to control the verbosity of the output.

```console
$ docker run node:lts npm --loglevel=info ...
```

## Image Variants

The `node` images come in many flavors, each designed for a specific use case.
All of the images contain pre-installed versions of `node` which includes also
[`npm`](https://www.npmjs.com/). For each
supported architecture, the supported variants are different. In the file:
[versions.json](./versions.json), it lists all supported variants for all of
the architectures that we support now.

The legacy package manager
[Yarn v1 Classic](https://classic.yarnpkg.com/)
is included in `node` images with Node.js 25 and below. See
[Yarn v1 Classic bundling](#yarn-v1-classic-bundling) for details.

View the list of currently supported floating and pinned tags on [Docker Hub](https://hub.docker.com/_/node).

### `node:<version>`

This is the defacto image. If you are unsure about what your needs are, you
probably want to use this one. It is designed to be used both as a throw away
container (mount your source code and start the container to start your app), as
well as the base to build other images off of. This tag is based off of
[`buildpack-deps`](https://registry.hub.docker.com/_/buildpack-deps/).
`buildpack-deps` is designed for the average user of docker who has many images
on their system. It, by design, has a large number of extremely common Debian
packages. This reduces the number of packages that images that derive from it
need to install, thus reducing the overall size of all images on your system.

### `node:lts`

This is a special form of `node:<version>` that selects the
Active Long Term Support version of Node.js. See also [Long Term Support](#long-term-support-lts) below for more detail.

### `node:alpine`

This image is based on
[Alpine Linux](https://alpinelinux.org). Because base
[alpine](https://hub.docker.com/_/alpine) images are smaller
than corresponding base
[debian](https://hub.docker.com/_/debian) images, the resulting
`node:alpine` Docker images are around 25% smaller than the
Debian-based `node:slim` images.

Alpine images use the C library
[musl libc](https://musl.libc.org/), not the GNU C library
[glibc](https://sourceware.org/glibc/) used by Debian.

Generally, applications written for Debian (`glibc`) will not run under Alpine (`musl`).
Some compatibility issues may be resolvable by installing the Alpine
[`gcompat`](https://pkgs.alpinelinux.org/package/v3.23/main/x86/gcompat)
GNU C Library compatibility layer for musl package.
Use `apk add --no-cache gcompat` to install.

Tools such as `git` or `bash` are not included in `node:alpine*` based images. The
[Alpine documentation](https://docs.alpinelinux.org/) describes how to find and
install additional packages using `apk` (Alpine Package Keeper).

The
[Best Practices document](./docs/BestPractices.md), in the section
[Smaller images without npm/yarn](./docs/BestPractices.md#smaller-images-without-npmyarn),
shows how to produce a custom image by removing package managers in a multi-stage build.

### `node:bullseye`

This image is based on version 11 of
[Debian](https://debian.org), available in
[the `debian` official image](https://hub.docker.com/_/debian).

### `node:bookworm`

This image is based on version 12 of
[Debian](https://debian.org), available in
[the `debian` official image](https://hub.docker.com/_/debian).

### `node:trixie`

This image is based on version 13 of
[Debian](https://debian.org), available in
[the `debian` official image](https://hub.docker.com/_/debian).

### `node:slim`

This image does not contain the common packages contained in the default tag and
only contains the minimal packages needed to run `node`. Unless you are working
in an environment where _only_ the Node.js image will be deployed and you have
space constraints, we highly recommend using the default image of this
repository.

## Long Term Support (LTS)

Production applications should only use LTS releases.

Refer to [Node.js Releases](https://github.com/nodejs/release#readme) for a description
of release phases and schedule.

If no version selection is made in a tag, for example, `node:slim`,
then the Current release is selected.
`node` images using the Active LTS release are published with an `lts` floating tag
to aid their selection. `node:lts` can be used on its own, or in combination with other tags
such as `node:lts-slim`. To select a `node` image based on a Maintenance LTS version
use the literal node version in the tag.

## Release Availability

This repo automatically triggers a process to build new `node` images when Node.js releases
become available. The build processes can take several hours to complete.

Images may initially appear on [Docker Hub](https://hub.docker.com/_/node)
with incomplete or missing OS/ARCH listings as the build process first publishes a tag
and then backfills each architecture when ready.
During this time, if you try to pull the image, you may see an error
message "no matching manifest". In this case, check back later.
(See [Docker Library FAQs](https://github.com/docker-library/faq#an-images-source-changed-in-git-now-what)
for a detailed description of the complex build process.)

For Node.js security releases, Debian-based `node` images may be published in advance
of Alpine-based images. To build an Alpine-based `node` image requires
a `musl` build. This may not initially be ready at Node.js release time.
When processing non-security Node.js releases, the build process will wait for
the `musl` build before proceeding with Debian- and Alpine-based images.

## License

[License information](https://github.com/nodejs/node/blob/main/LICENSE) for
the software contained in this image. [License information](LICENSE) for the
Node.js Docker project.

## Supported Docker versions

If you are using [Docker Desktop](https://docs.docker.com/get-started/get-docker/),
it is recommended to use a recent version, released in the last six months.

Refer to [Docker Engine release notes](https://docs.docker.com/engine/release-notes/)
for current Engine versions.

## Supported Node.js versions

Support for `node` Docker images is limited to
[Node.js active versions](https://github.com/nodejs/Release#release-schedule).

Before opening an issue in this repo, please consider if the problem only occurs
in a `node` Docker environment.

If a problem can also be reproduced without using an image from this repo,
for example in a non-Docker environment,
then it should be reported to the corresponding component.

Use the
[Node.js issues](https://github.com/nodejs/node/issues) or the
[npm issues](https://github.com/npm/cli/issues) list to check for known issues
or to report new issues for these components.

## Supported architectures

`node` images are built for the Linux operating system and architecture combinations defined in [versions.json](https://github.com/nodejs/docker-node/blob/main/versions.json).

- The [Node.js Platform list](https://github.com/nodejs/node/blob/main/BUILDING.md#official-binary-platforms-and-toolchains) defines [Support Tiers](https://github.com/nodejs/node/blob/main/BUILDING.md#strategy) 1, 2 and Experimental for platform and architecture combinations of Node.js builds and for each separate Node.js release line
- The [Docker official images library](https://github.com/docker-library/official-images#architectures-other-than-amd64) lists the supported architectures in the Docker build environment

Each of the architectures for Debian images belong to the Node.js support tier 1 or 2, recommended for production applications.

### musl builds for Alpine

`musl` builds for `amd64` are listed under support tier "Experimental" and are tested by the Node.js build process before being used in Docker images. "Experimental" status for Node.js is defined as:

> Experimental: May not compile or test suite may not pass. The core team does not create releases for these platforms. Test failures on experimental platforms do not block releases. Contributions to improve support for these platforms are welcome.

`musl` builds for other architectures, including `arm64`, are not tested before release.

## Yarn v1 Classic bundling

The [Yarn v1 Classic](https://classic.yarnpkg.com/) package manager is bundled in `node` image
variants that include Node.js versions 25 and below.

Yarn v1 is not bundled into `node` images as of Node.js 26.0.0.
This version of the Yarn package manager has been declared as [frozen](https://github.com/yarnpkg/yarn) and is no longer maintained.

Users with legacy requirements for Yarn v1 under Node.js 26 and above may be able
to follow [Yarn v1 installation instructions](https://classic.yarnpkg.com/en/docs/install)
and install using `npm install --global yarn`.

## Governance and Current Members

The Node.js Docker Image is governed by an open maintainer model. See
[GOVERNANCE.md](GOVERNANCE.md)
for project roles and decision-making, and [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidance. If a final decision cannot be reached using consensus seeking, the Node.js TSC is the final arbiter.

### Docker Maintainers

- Simen Bekkhus ([SimenB](https://github.com/SimenB))
- Peter Dave Hello ([PeterDaveHello](https://github.com/PeterDaveHello))
- Rafael Gonzaga ([rafaelgss](https://github.com/rafaelgss))
- Matteo Collina ([mcollina](https://github.com/mcollina))
- Nick Schonning ([nschonni](https://github.com/nschonni))

### Collaborators

- Laurent Goderre ([LaurentGoderre](https://github.com/LaurentGoderre))
- Tianon Gravi ([tianon](https://github.com/tianon))
- [yosifkit](https://github.com/yosifkit)
- Stewart X Addison ([sxa](https://github.com/sxa))
- Mike McCready ([MikeMcC399](https://github.com/MikeMcC399))

Collaborators are managed via the
[@nodejs/docker team](https://github.com/orgs/nodejs/teams/docker).

### Emeritus

- Hans Kristian Flaatten ([Starefossen](https://github.com/Starefossen))
- Mikeal Rogers ([mikeal](https://github.com/mikeal))
- Christopher Horrell ([chorrell](https://github.com/chorrell))
- Peter Petrov ([pesho](https://github.com/pesho))
- John Mitchell ([jlmitch5](https://github.com/jlmitch5))
- Hugues Malphettes ([hmalphettes](https://github.com/hmalphettes))
- ttshivers ([ttshivers](https://github.com/ttshivers))
