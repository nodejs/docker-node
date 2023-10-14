# Security Policy

## Reporting a Vulnerability

Security issues relating to Node.js project should follow the process documented on <https://nodejs.org/en/security/>.

CVEs for the base image packages should be reported to those repositories. Nothing to address those CVEs is in the hands of this repos.

- [Alpine](https://github.com/alpinelinux/docker-alpine)
- [Debian (buster, bullseye, bookworm)](https://github.com/debuerreotype/docker-debian-artifacts)

When base images are patched, the images are rebuilt and rolled out to the Docker hub without intervention by this repo. This process is explained in <https://github.com/docker-library/faq/#why-does-my-security-scanner-show-that-an-image-has-cves>.
