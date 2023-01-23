# Node.js

[![dockeri.co](http://dockeri.co/image/_/node)](https://registry.hub.docker.com/_/node/)

[![GitHub issues](https://img.shields.io/github/issues/nodejs/docker-node.svg "GitHub issues")](https://github.com/nodejs/docker-node)
[![GitHub stars](https://img.shields.io/github/stars/nodejs/docker-node.svg "GitHub stars")](https://github.com/nodejs/docker-node)

The official Node.js docker image, made with love by the node community.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Table of Contents

- [What is Node.js?](#what-is-nodejs)
- [How to use this image](#how-to-use-this-image)
  - [Create a `Dockerfile` in your Node.js app project](#create-a-dockerfile-in-your-nodejs-app-project)
  - [Best Practices](#best-practices)
  - [Run a single Node.js script](#run-a-single-nodejs-script)
  - [Verbosity](#verbosity)
    - [Dockerfile](#dockerfile)
    - [Docker Run](#docker-run)
    - [NPM run](#npm-run)
- [Image Variants](#image-variants)
  - [`node:<version>`](#nodeversion)
  - [`node:alpine`](#nodealpine)
  - [`node:buster`](#nodebuster)
  - [`node:bullseye`](#nodebullseye)
  - [`node:jammy`](#nodejammy)
  - [`node:kinetic`](#nodekinetic)
  - [`node:slim`](#nodeslim)
- [License](#license)
- [Supported Docker versions](#supported-docker-versions)
- [Supported Node.js versions](#supported-nodejs-versions)
- [Governance and Current Members](#governance-and-current-members)
  - [Docker Working Group Members](#docker-working-group-members)
  - [Docker Working Group Collaborators](#docker-working-group-collaborators)
  - [Emeritus](#emeritus)
    - [Docker Working Group Members](#docker-working-group-members-1)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## What is Node.js?

Node.js is a platform built on Chrome's JavaScript runtime for easily building
fast, scalable network applications. Node.js uses an event-driven, non-blocking
I/O model that makes it lightweight and efficient, perfect for data-intensive
real-time applications that run across distributed devices.

See: http://nodejs.org

## How to use this image

### Create a `Dockerfile` in your Node.js app project

```dockerfile
# specify the node base image with your desired version node:<version>
FROM node:16
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
version: "2"
services:
  node:
    image: "node:8"
    user: "node"
    working_dir: /home/node/app
    environment:
      - NODE_ENV=production
    volumes:
      - ./:/home/node/app
    expose:
      - "8081"
    command: "npm start"
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
$ docker run -it --rm --name my-running-script -v "$PWD":/usr/src/app -w /usr/src/app node:8 node your-daemon-or-script.js
```

### Verbosity

Prior to 8.7.0 and 6.11.4 the docker images overrode the default npm log
level from `warn` to `info`. However due to improvements to npm and new Docker
patterns (e.g. multi-stage builds) the working group reached a [consensus](https://github.com/nodejs/docker-node/issues/528)
to revert the log level to npm defaults. If you need more verbose output, please
use one of the following methods to change the verbosity level.

#### Dockerfile

If you create your own `Dockerfile` which inherits from the `node` image you can
simply use `ENV` to override `NPM_CONFIG_LOGLEVEL`.

```dockerfile
FROM node
ENV NPM_CONFIG_LOGLEVEL info
...
```

#### Docker Run

If you run the node image using `docker run` you can use the `-e` flag to
override `NPM_CONFIG_LOGLEVEL`.

```console
$ docker run -e NPM_CONFIG_LOGLEVEL=info node ...
```

#### NPM run

If you are running npm commands you can use `--loglevel` to control the
verbosity of the output.

```console
$ docker run node npm --loglevel=warn ...
```

## Image Variants

The `node` images come in many flavors, each designed for a specific use case.
All of the images contain pre-installed versions of `node`,
[`npm`](https://www.npmjs.com/), and [`yarn`](https://yarnpkg.com). For each
supported architecture, the supported variants are different. In the file:
[versions.json](./versions.json), it lists all supported variants for all of
the architectures that we support now.

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

### `node:alpine`

This image is based on the popular
[Alpine Linux project](http://alpinelinux.org), available in
[the `alpine` official image](https://hub.docker.com/_/alpine). Alpine Linux is
much smaller than most distribution base images (~5MB), and thus leads to much
slimmer images in general.

This variant is highly recommended when final image size being as small as
possible is desired. The main caveat to note is that it does use
[musl libc](http://www.musl-libc.org) instead of
[glibc and friends](http://www.etalabs.net/compare_libcs.html), so certain
software might run into issues depending on the depth of their libc
requirements. However, most software doesn't have an issue with this, so this
variant is usually a very safe choice. See
[this Hacker News comment thread](https://news.ycombinator.com/item?id=10782897)
for more discussion of the issues that might arise and some pro/con comparisons
of using Alpine-based images. One common issue that may arise is a missing shared
library required for use of `process.dlopen`. To add the missing shared libraries
to your image, adding the [`libc6-compat`](https://pkgs.alpinelinux.org/package/edge/main/x86/libc6-compat)
package in your Dockerfile is recommended: `apk add --no-cache libc6-compat`

To minimize image size, it's uncommon for additional related tools
(such as `git` or `bash`) to be included in Alpine-based images. Using this
image as a base, add the things you need in your own Dockerfile
(see the [`alpine` image description](https://hub.docker.com/_/alpine/) for
examples of how to install packages if you are unfamiliar).

### `node:buster`

This image is based on version 10 of
[Debian](http://debian.org), available in
[the `debian` official image](https://hub.docker.com/_/debian).

### `node:bullseye`

This image is based on version 11 of
[Debian](http://debian.org), available in
[the `debian` official image](https://hub.docker.com/_/debian).

### `node:jammy`

This image is based on version 22.04 of
[Ubuntu](http://ubuntu.com), available in
[the `ubuntu` official image](https://hub.docker.com/_/ubuntu).

### `node:kinetic`

This image is based on version 22.10 of
[Ubuntu](http://ubuntu.com), available in
[the `ubuntu` official image](https://hub.docker.com/_/ubuntu).

### `node:slim`

This image does not contain the common packages contained in the default tag and
only contains the minimal packages needed to run `node`. Unless you are working
in an environment where *only* the Node.js image will be deployed and you have
space constraints, we highly recommend using the default image of this
repository.

## License

[License information](https://github.com/nodejs/node/blob/master/LICENSE) for
the software contained in this image. [License information](LICENSE) for the
Node.js Docker project.

## Supported Docker versions

This image is officially supported on Docker version 1.9.1.

Support for older versions (down to 1.6) is provided on a best-effort basis.

Please see [the Docker installation
documentation](https://docs.docker.com/installation/) for details on how to
upgrade your Docker daemon.

## Supported Node.js versions

This project will support Node.js versions as still under active support as per the [Node.js release schedule](https://github.com/nodejs/Release).

## Governance and Current Members

The Node.js Docker Image is governed by the Docker Working Group. See
[GOVERNANCE.md](GOVERNANCE.md)
to learn more about the group's structure and [CONTRIBUTING.md](CONTRIBUTING.md) for guidance
about the expectations for all contributors to this project.

### Docker Working Group Members

- Hans Kristian Flaatten ([starefossen](https://github.com/starefossen))
- Hugues Malphettes ([hmalphettes](https://github.com/hmalphettes))
- John Mitchell ([jlmitch5](https://github.com/jlmitch5))

### Docker Working Group Collaborators

- Mikeal Rogers ([mikeal](https://github.com/mikeal))
- Laurent Goderre ([LaurentGoderre](https://github.com/LaurentGoderre))
- Simen Bekkhus ([SimenB](https://github.com/SimenB))
- Peter Dave Hello ([PeterDaveHello](https://github.com/PeterDaveHello))

### Emeritus

#### Docker Working Group Members

- Christopher Horrell ([chorrell](https://github.com/chorrell))
- Peter Petrov ([pesho](https://github.com/pesho))
