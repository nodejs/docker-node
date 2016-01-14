# Node.js

[![dockeri.co](http://dockeri.co/image/_/node)](https://registry.hub.docker.com/_/node/)

[![GitHub issues](https://img.shields.io/github/issues/nodejs/docker-node.svg "GitHub issues")](https://github.com/nodejs/docker-node)
[![GitHub stars](https://img.shields.io/github/stars/nodejs/docker-node.svg "GitHub stars")](https://github.com/nodejs/docker-node)

The official Node.js docker image, made with love by the node community.

## What is Node.js?

Node.js is a platform built on Chrome's JavaScript runtime for easily building
fast, scalable network applications. Node.js uses an event-driven, non-blocking
I/O model that makes it lightweight and efficient, perfect for data-intensive
real-time applications that run across distributed devices.

See: http://nodejs.org

## Usage

# How to use this image

## Create a `Dockerfile` in your Node.js app project

```dockerfile
FROM node:4-onbuild
# replace this with your application's default port
EXPOSE 8888
```

You can then build and run the Docker image:

```console
$ docker build -t my-nodejs-app .
$ docker run -it --rm --name my-running-app my-nodejs-app
```

### Notes

The image assumes that your application has a file named
[`package.json`](https://docs.npmjs.com/files/package.json) listing its
dependencies and defining its [start
script](https://docs.npmjs.com/misc/scripts#default-values).

## Run a single Node.js script

For many simple, single file projects, you may find it inconvenient to write a
complete `Dockerfile`. In such cases, you can run a Node.js script by using the
Node.js Docker image directly:

```console
$ docker run -it --rm --name my-running-script -v "$PWD":/usr/src/app -w
/usr/src/app node:4 node your-daemon-or-script.js
```

# Image Variants

The `node` images come in many flavors, each designed for a specific use case.

## `node:<version>`

This is the defacto image. If you are unsure about what your needs are, you
probably want to use this one. It is designed to be used both as a throw away
container (mount your source code and start the container to start your app), as
well as the base to build other images off of. This tag is based off of
[`buildpack-deps`](https://registry.hub.docker.com/_/buildpack-deps/).
`buildpack-deps` is designed for the average user of docker who has many images
on their system. It, by design, has a large number of extremely common Debian
packages. This reduces the number of packages that images that derive from it
need to install, thus reducing the overall size of all images on your system.

## `node:onbuild`

This image makes building derivative images easier. For most use cases, creating
a `Dockerfile` in the base of your project directory with the line `FROM
node:onbuild` will be enough to create a stand-alone image for your project.

While the `onbuild` variant is really useful for "getting off the ground
running" (zero to Dockerized in a short period of time), it's not recommended
for long-term usage within a project due to the lack of control over *when* the
`ONBUILD` triggers fire (see also
[`docker/docker#5714`](https://github.com/docker/docker/issues/5714),
[`docker/docker#8240`](https://github.com/docker/docker/issues/8240),
[`docker/docker#11917`](https://github.com/docker/docker/issues/11917)).

Once you've got a handle on how your project functions within Docker, you'll
probably want to adjust your `Dockerfile` to inherit from a non-`onbuild`
variant and copy the commands from the `onbuild` variant `Dockerfile` (moving
the `ONBUILD` lines to the end and removing the `ONBUILD` keywords) into your
own file so that you have tighter control over them and more transparency for
yourself and others looking at your `Dockerfile` as to what it does. This also
makes it easier to add additional requirements as time goes on (such as
installing more packages before performing the previously-`ONBUILD` steps).

This `onbuild` variant will only install npm packages according to the
`package.json` and *does not* adhere to the `npm-shrinkwrap.json` (see full
discussion in
[`nodejs/docker-node#65`](https://github.com/nodejs/docker-node/issues/65).

## `node:slim`

This image does not contain the common packages contained in the default tag and
only contains the minimal packages needed to run `node`. Unless you are working
in an environment where *only* the Node.js image will be deployed and you have
space constraints, we highly recommend using the default image of this
repository.

# License

[License information](https://github.com/nodejs/node/blob/master/LICENSE) for
the software contained in this image. [License
information](https://github.com/nodejs/docker-node/blob/master/LICENSE) for the
Node.js Docker project.

# Supported Docker versions

This image is officially supported on Docker version 1.9.1.

Support for older versions (down to 1.6) is provided on a best-effort basis.

Please see [the Docker installation
documentation](https://docs.docker.com/installation/) for details on how to
upgrade your Docker daemon.

# People

Current Project Team Members:

 * [@chorrell](https://github.com/chorrell)
 * [@hmalphettes](https://www.github.com/hmalphettes)
 * [@jlmitch5](https://www.github.com/jlmitch5)
 * [@pesho](https://www.github.com/pesho)
 * [@Starefossen](https://www.github.com/starefossen)
 * [@wblankenship](https://www.github.com/wblankenship)
