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

If you want to distribute your application on the docker registry, create a
`Dockerfile` in the root of application directory:

```Dockerfile
FROM node:onbuild

# Expose the ports that your app uses. For example:
EXPOSE 8080
```

Then simply run:

```
$ docker build -t node-app
...
$ docker run --rm -it node-app
```

To run a single script, you can mount it in a volume under `/usr/src/app`. From
the root of your application directory (assuming your script is named
`index.js`):

```
$ docker run -v ${PWD}:/usr/src/app -w /usr/src/app -it --rm node node index.js
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

This image is officially supported on Docker version 1.8.3.

Support for older versions (down to 1.0) is provided on a best-effort basis.

# People

Current Project Team Members:

 * [@chorrell](https://github.com/chorrell)
 * [@hmalphettes](https://www.github.com/hmalphettes)
 * [@jlmitch5](https://www.github.com/jlmitch5)
 * [@pesho](https://www.github.com/pesho)
 * [@Starefossen](https://www.github.com/starefossen)
 * [@wblankenship](https://www.github.com/wblankenship)
