'use strict';
const path = require('path');
const { readFileSync, writeFileSync } = require('fs');
const { getAllDockerfiles, getDockerfileNodeVersion } = require('./utils');
const versionJson = require('./versions.json');

const templates = Object.freeze({
  alpine: 1,
  debian: 2,
  debianSlim: 3,
});

const templateFileMap = Object.freeze({
  [templates.alpine]: 'Dockerfile-alpine.template',
  [templates.debian]: 'Dockerfile-debian.template',
  [templates.debianSlim]: 'Dockerfile-slim.template',
});

const templateRepoMap = Object.freeze({
  [templates.alpine]: 'alpine',
  [templates.debian]: 'buildpack-deps',
  [templates.debianSlim]: 'debian',
});

// nodeVersions is sorted
const getLatestNodeVersion = (nodeVersions, majorVersion) => nodeVersions
  .find((version) => version.startsWith(`${majorVersion}.`));

const getTemplate = (variant) => {
  if (variant.startsWith('alpine')) {
    return templates.alpine;
  }

  if (variant.endsWith('-slim')) {
    return templates.debianSlim;
  }

  return templates.debian;
};

const getDockerfileMetadata = (nodeVersions, file) => {
  const [nodeMajorVersion, variant] = path.dirname(file).split(path.sep).slice(-2);
  const fileNodeVersion = getDockerfileNodeVersion(file);

  return {
    file,
    variant,
    fileNodeVersion,
    nodeMajorVersion,
    latestVersion: getLatestNodeVersion(nodeVersions, nodeMajorVersion),
    template: getTemplate(variant),
  };
};

const isDockerfileOutdated = ({ fileNodeVersion, latestVersion }) => fileNodeVersion
  !== latestVersion;

const fetchLatestNodeVersions = async () => {
  const nodeDist = await fetch('https://nodejs.org/dist/index.json');
  const content = await nodeDist.json();
  return content.map(({ version }) => version.substring(1));
};

const findOutdated = async (updateAll) => {
  const nodeVersions = await fetchLatestNodeVersions();

  const dockerfileMetadatas = getAllDockerfiles(__dirname)
    .map((file) => getDockerfileMetadata(nodeVersions, file));

  return updateAll
    ? dockerfileMetadatas
    : dockerfileMetadatas.filter(isDockerfileOutdated);
};

const getKeys = (basename) => readFileSync(path.resolve(__dirname, 'keys', basename))
  .toString().trim().split('\n');

const readTemplate = (template) => readFileSync(
  path.resolve(__dirname, templateFileMap[template]),
).toString();

const getBaseImage = ({ template, variant }) => {
  const tag = template === templates.alpine
    ? variant.replace(/alpine/, '')
    : variant;

  return `${templateRepoMap[template]}:${tag}`;
};

const formatKeys = (keys) => keys.map((key) => `$1${key} \\`).join('\n');

const formatTemplate = (nodeKeys, muslChecksum, base, metadata) => {
  const { latestVersion, template, nodeMajorVersion } = metadata;
  const baseImage = getBaseImage(metadata);
  const arches = versionJson[nodeMajorVersion].variants[metadata.variant];
  let initialFormat = base.replace(/^FROM.+$/m, `FROM ${baseImage}`)
    .replace(/^ENV NODE_VERSION=.+$/m, `ENV NODE_VERSION=${latestVersion}`)
    .replace(/^(\s*)"\${NODE_KEYS\[@]}".*$/m, formatKeys(nodeKeys))

  if (parseInt(nodeMajorVersion, 10) >= 26) {
    initialFormat = initialFormat.replace(/ENV YARN_VERSION.*\*\n/s, '');
  }

  if (template === templates.alpine) {
    let archString = '';
    if (arches.includes('amd64')) archString += `x86_64) ARCH='x64' CHECKSUM="${muslChecksum}" OPENSSL_ARCH=linux-x86_64;; \\\n        `
    if (arches.includes('arm64v8')) archString += `aarch64) OPENSSL_ARCH=linux-aarch64;; \\\n        `
    if (arches.includes('arm32v6') || arches.includes('arm32v7')) archString += `arm*) OPENSSL_ARCH=linux-armv4;; \\\n        `
    if (arches.includes('ppc64le')) archString += `ppc64le) OPENSSL_ARCH=linux-ppc64le;; \\\n        `
    if (arches.includes('s390x')) archString += `s390x) OPENSSL_ARCH=linux-s390x;; \\\n        `
    archString += '*) ;; \\'

    initialFormat = initialFormat.replace(/"\$\{ALPINE_ARCH\[@\]\}"/s, archString);

    // Strip out rust and cargo packages for Node.js < 26
    if (parseInt(nodeMajorVersion, 10) < 26) {
      initialFormat = initialFormat.replace(/    rust \\.*cargo \\\s*/s, '');
    }
  } else if (template === templates.debianSlim) {
    let archString = '';
    if (arches.includes('amd64')) archString += `amd64) ARCH='x64' OPENSSL_ARCH='linux-x86_64';; \\\n      `
    if (arches.includes('ppc64le')) archString += `ppc64el) ARCH='ppc64le' OPENSSL_ARCH='linux-ppc64le';; \\\n      `
    if (arches.includes('s390x')) archString += `s390x) ARCH='s390x' OPENSSL_ARCH='linux*-s390x';; \\\n      `
    if (arches.includes('arm64v8')) archString += `arm64) ARCH='arm64' OPENSSL_ARCH='linux-aarch64';; \\\n      `
    if (arches.includes('arm32v7')) archString += `armhf) ARCH='armv7l' OPENSSL_ARCH='linux-armv4';; \\\n      `
    archString += '*) echo "unsupported architecture"; exit 1 ;; \\'

    initialFormat = initialFormat.replace(/"\$\{DEB_ARCH\[@\]\}"/s, archString);
  } else if (template === templates.debian) {
    let archString = '';
    if (arches.includes('amd64')) archString += `amd64) ARCH='x64';; \\\n    `
    if (arches.includes('ppc64le')) archString += `ppc64el) ARCH='ppc64le';; \\\n    `
    if (arches.includes('s390x')) archString += `s390x) ARCH='s390x';; \\\n    `
    if (arches.includes('arm64v8')) archString += `arm64) ARCH='arm64';; \\\n    `
    if (arches.includes('arm32v7')) archString += `armhf) ARCH='armv7l';; \\\n    `
    archString += '*) echo "unsupported architecture"; exit 1 ;; \\'

    initialFormat = initialFormat.replace(/"\$\{DEB_ARCH\[@\]\}"/s, archString);
  }

  return initialFormat;
};

const fetchMuslChecksum = async (nodeVersion) => {
  const checksums = await fetch(
    `https://unofficial-builds.nodejs.org/download/release/v${nodeVersion}/SHASUMS256.txt`,
  );
  const content = await checksums.text();
  return await content.match(/(\S+)\s+\S+-linux-x64-musl.tar.xz/m)[1];
};

const updateDockerfile = async (nodeKeys, metadata) => {
  const { file, template, latestVersion } = metadata;
  const base = readTemplate(template);
  const muslChecksum = await fetchMuslChecksum(latestVersion);

  const formatted = formatTemplate(nodeKeys, muslChecksum, base, metadata);
  writeFileSync(file, formatted);
};

const updateDockerfiles = async (outdated) => {
  const nodeKeys = getKeys('node.keys');

  await Promise.all(
    outdated.map((metadata) => updateDockerfile(nodeKeys, metadata)),
  );
};

const update = async (updateAll) => {
  const outdated = await findOutdated(updateAll);
  await updateDockerfiles(outdated);
  return outdated;
};

module.exports = update;
