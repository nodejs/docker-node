# Docker and Node.js Best Practices

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

By default, Docker runs container as root which inside of the container can pose as a security issue. You would want to run the container as an unprivileged user wherever possible. The node images (with the exception of the `onbuild` variant) provide the `node` user for such purpose. The Docker Image can than be run with the `node` user in the following way:

```
-u "node"
```
When using the `onbuild` variant, add the user like so:

```Dockerfile
FROM node:4.1.2-onbuild
# Add our user and group first to make sure their IDs get assigned consistently
RUN groupadd -r node && useradd -r -g node node
```

When using the `alpine` variant, add the user like so:

```Dockerfile
FROM node:7.3.0-alpine
RUN addgroup -S node && adduser -S -g node node 
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
  && delgroup node \
  && addgroup -S node -g 999 \
  && adduser -S -g node -u 999 node
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
