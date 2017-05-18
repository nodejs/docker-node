# Docker and Node.js Best Practices

## Table of Contents

- [Environment Variables](#environment-variables)
- [Handling Kernel Signals](#handling-kernel-signals)
- [Non-root User](#non-root-user)
- [Memory](#memory)
- [CMD](#cmd)
- [Docker Run](#docker-run)
- [Security](#security)

## Environment Variables

Run with `NODE_ENV` set to `production`. This is the way you would pass in secrets and other runtime configurations to your application as well.

```
-e "NODE_ENV=production"
```
## Handling Kernel Signals

Node.js was not designed to run as PID 1 which leads to unexpected behaviour when running inside of Docker. For example, a Node.js process running as PID 1 will not respond to `SIGTERM` (`CTRL-C`) and similar signals. As of Docker 1.3, you can use the `--init` flag to wrap your Node.js process with a [lightweight init system](https://github.com/krallin/tini) that properly handles running as PID 1.

```
docker run -it --init node
```

You can also include tini [directly in your Dockerfile](https://github.com/krallin/tini#using-tini), ensuring your process is always started with an init wrapper.

## Non-root User

By default, Docker runs container as root which inside of the container can pose as a security issue. You would want to run the container as an unprivileged user wherever possible. The node images provide the `node` user for such purpose. The Docker Image can than be run with the `node` user in the following way:

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

## Memory

By default, any Docker Container may consume as much of the hardware such as CPU and RAM. If you are running multiple containers on the same host you should limit how much memory they can consume.     

```
-m "300M" --memory-swap "1G"
```

## CMD

When creating an image, you can bypass the `package.json`'s `start` command and bake it directly into the image itself. This reduces the number of processes running inside of your container.

```Dockerfile
CMD ["node","index.js"]
```

## Docker Run

Here is an example of how you would run a default Node.JS Docker Containerized application:

```
$ docker run \
  -e "NODE_ENV=production" \
  -u "node" \
  -m "300M" --memory-swap "1G" \
  -w "/home/node/app" \
  --name "my-nodejs-app" \
  node [script]
```

## Security

The Docker team has provided a tool to analyze your running containers for potential security issues. You can download and run this tool from here: https://github.com/docker/docker-bench-security
