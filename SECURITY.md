# Security Policy

## Reporting a Vulnerability

This repo builds releases of Node.js unchanged into Docker images. Node.js itself bundles certain packages as described in the [distribution](https://github.com/nodejs/node/blob/main/doc/contributing/distribution.md) document. This includes also the npm package manager.

Common Vulnerabilities and Exposures (CVE) reports that relate to Node.js or its packaged dependencies cannot be addressed in this repo. Security issues relating to the Node.js project should follow the process documented on <https://nodejs.org/en/security/> where it is also advised that vulnerabilities in third-party packages should be reported to their respective owners.

CVEs for the base operating system image packages should be reported to those repositories. Nothing to address those CVEs is in the hands of this repo.

- [Alpine](https://github.com/alpinelinux/docker-alpine)
- [Debian (bullseye, bookworm, trixie)](https://github.com/debuerreotype/docker-debian-artifacts)

When base images are patched, the images are rebuilt and rolled out to the Docker hub without intervention by this repo. This process is explained in <https://github.com/docker-library/faq/#why-does-my-security-scanner-show-that-an-image-has-cves>.

When vulnerabilities are resolved in a Node.js release, they are routinely released in a corresponding new Node.js Docker image from time to time as needed.

Please do not open issues in this repo for vulnerabilities in the above components. If they cannot be actioned here, the issue will be closed.
