# Contributing to docker-node

Thank you for your contribution. Here are a set of guidelines for contributing to the docker-node project.

## Adding dependencies to the base images

NodeJS is a big ecosystem with a variety of different use cases. The docker images for node are designed to provide the minimum for running core node.  Additional dependencies (including dependencies for npm or yarn such as git) will not be included in these base images and will need to be included in descendent image. We however maintain a list of common dependencies you can add to your image (TODO).
