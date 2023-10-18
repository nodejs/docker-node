# Docker and Node.js Best Practices

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Table of Contents

- [Environment Variables](#environment-variables)
- [Global npm dependencies](#global-npm-dependencies)
- [Upgrading/downgrading Yarn](#upgradingdowngrading-yarn)
  - [Local](#local)
  - [Global](#global)
- [Handling Kernel Signals](#handling-kernel-signals)
- [Non-root User](#non-root-user)
- [Memory](#memory)
- [CMD](#cmd)
- [Docker Run](#docker-run)
- [Security](#security)
- [node-gyp alpine](#node-gyp-alpine)
- [Smaller images without npm/yarn](#smaller-images-without-npmyarn)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Environment Variables

Run with `NODE_ENV` set to `production`. This is the way you would pass in secrets and other runtime configurations to your application as well.

```
-e "NODE_ENV=production"
```

## Global npm dependencies

If you need to install global npm dependencies, it is recommended to place those dependencies in the [non-root user](#non-root-user) directory. To achieve this, add the following line to your `Dockerfile`

```Dockerfile
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global

ENV PATH=$PATH:/home/node/.npm-global/bin # optionally if you want to run npm global bin without specifying path
```

## Upgrading/downgrading Yarn

### Local

If you need to upgrade/downgrade `yarn` for a local install, you can do so by issuing the following commands in your `Dockerfile`:

> Note that if you create some other directory which is not a descendant one from where you ran the command, you will end up using the global (dated) version. If you wish to upgrade `yarn` globally follow the instructions in the next section.

> When following the local install instructions, due to duplicated yarn the image will end up being bigger.

```Dockerfile
FROM node:6

ENV YARN_VERSION 1.16.0

RUN yarn policies set-version $YARN_VERSION
```

### Global

```Dockerfile
FROM node:6

ENV YARN_VERSION 1.16.0

RUN curl -fSLO --compressed "https://yarnpkg.com/downloads/$YARN_VERSION/yarn-v$YARN_VERSION.tar.gz" \
    && tar -xzf yarn-v$YARN_VERSION.tar.gz -C /opt/ \
    && ln -snf /opt/yarn-v$YARN_VERSION/bin/yarn /usr/local/bin/yarn \
    && ln -snf /opt/yarn-v$YARN_VERSION/bin/yarnpkg /usr/local/bin/yarnpkg \
    && rm yarn-v$YARN_VERSION.tar.gz
```

If you're using an Alpine-based image, `curl` won't be present, so you'll need to make sure it's installed while using it:

```Dockerfile
FROM node:6-alpine

ENV YARN_VERSION 1.5.1

RUN apk add --no-cache --virtual .build-deps-yarn curl \
    && curl -fSLO --compressed "https://yarnpkg.com/downloads/$YARN_VERSION/yarn-v$YARN_VERSION.tar.gz" \
    && tar -xzf yarn-v$YARN_VERSION.tar.gz -C /opt/ \
    && ln -snf /opt/yarn-v$YARN_VERSION/bin/yarn /usr/local/bin/yarn \
    && ln -snf /opt/yarn-v$YARN_VERSION/bin/yarnpkg /usr/local/bin/yarnpkg \
    && rm yarn-v$YARN_VERSION.tar.gz \
    && apk del .build-deps-yarn
```

## Handling Kernel Signals

Node.js was not designed to run as PID 1 which leads to unexpected behaviour when running inside of Docker. For example, a Node.js process running as PID 1 will not respond to `SIGINT` (`CTRL-C`) and similar signals. As of Docker 1.13, you can use the `--init` flag to wrap your Node.js process with a [lightweight init system](https://github.com/krallin/tini) that properly handles running as PID 1.

```
docker run -it --init node
```

You can also include Tini [directly in your Dockerfile](https://github.com/krallin/tini#using-tini), ensuring your process is always started with an init wrapper.

## Non-root User

By default, Docker runs commands inside the container as root which violates the [Principle of Least Privilege (PoLP)](https://en.wikipedia.org/wiki/Principle_of_least_privilege) when superuser permissions are not strictly required. You want to run the container as an unprivileged user whenever possible. The node images provide the `node` user for such purpose. The Docker Image can then be run with the `node` user in the following way:

```
-u "node"
```

Alternatively, the user can be activated in the `Dockerfile`:

```Dockerfile
FROM node:6.10.3
...
# At the end, set the user to use when running this image
USER node
```

Note that the `node` user is neither a build-time nor a run-time dependency and it can be removed or altered, as long as the functionality of the application you want to add to the container does not depend on it.

If you do not want nor need the user created in this image you can remove it with the following:

```Dockerfile
# For debian based images use:
RUN userdel -r node

# For alpine based images use:
RUN deluser --remove-home node
```

If you need to change the uid/gid of the user you can use:

```Dockerfile
RUN groupmod -g 999 node && usermod -u 999 -g 999 node
```

If you need another name for the user (ex. `myapp`) execute:

```Dockerfile
RUN usermod -d /home/myapp -l myapp node
```

For alpine based images, you do not have `groupmod` nor `usermod`, so to change the uid/gid you have to delete the previous user:

```Dockerfile
RUN deluser --remove-home node \
  && addgroup -S node -g 999 \
  && adduser -S -G node -u 999 node
```

## Memory

By default, any Docker Container may consume as much of the hardware such as CPU and RAM. If you are running multiple containers on the same host you should limit how much memory they can consume.

```
-m "300M" --memory-swap "1G"
```

## CMD

When creating an image, you can bypass the `package.json`'s `start` command and bake it directly into the image itself. First off this reduces the number of processes running inside of your container. Secondly it causes exit signals such as `SIGTERM` and `SIGINT` to be received by the Node.js process instead of npm swallowing them.

```Dockerfile
CMD ["node","index.js"]
```

## Docker Run

Here is an example of how you would run a default Node.JS Docker Containerized application:

```
$ docker run \
  --init \
  -e "NODE_ENV=production" \
  -u "node" \
  -m "300M" --memory-swap "1G" \
  -w "/home/node/app" \
  --name "my-nodejs-app" \
  node [script]
```

## Security

The Docker team has provided a tool to analyze your running containers for potential security issues. You can download and run this tool from here: https://github.com/docker/docker-bench-security

## node-gyp alpine

Here is an example of how you would install dependencies for packages that require node-gyp support on the alpine variant:

```Dockerfile
FROM node:alpine

RUN apk add --no-cache --virtual .gyp python3 make g++ \
    && npm install [ your npm dependencies here ] \
    && apk del .gyp
```

And Here's a multistage build example

```Dockerfile
FROM node:alpine as builder

## Install build toolchain, install node deps and compile native add-ons
RUN apk add --no-cache python3 make g++
RUN npm install [ your npm dependencies here ]

FROM node:alpine as app

## Copy built node modules and binaries without including the toolchain
COPY --from=builder node_modules .
```


## Smaller images without npm/yarn

If you want to achieve an even smaller image size than the `-alpine`, you can omit the npm/yarn like this:

```Dockerfile
ARG ALPINE_VERSION=3.16

FROM node:18-alpine${ALPINE_VERSION} AS builder
WORKDIR /build-stage
COPY package*.json ./
RUN npm ci
# Copy the the files you need
COPY . ./
RUN npm run build

FROM alpine:${ALPINE_VERSION}
# Create app directory
WORKDIR /usr/src/app
# Add required binaries
RUN apk add --no-cache libstdc++ dumb-init \
  && addgroup -g 1000 node && adduser -u 1000 -G node -s /bin/sh -D node \
  && chown node:node ./
COPY --from=builder /usr/local/bin/node /usr/local/bin/
COPY --from=builder /usr/local/bin/docker-entrypoint.sh /usr/local/bin/
ENTRYPOINT ["docker-entrypoint.sh"]
USER node
# Update the following COPY lines based on your codebase
COPY --from=builder /build-stage/node_modules ./node_modules
COPY --from=builder /build-stage/dist ./dist
# Run with dumb-init to not start node with PID=1, since Node.js was not designed to run as PID 1
CMD ["dumb-init", "node", "dist/index.js"]
```


