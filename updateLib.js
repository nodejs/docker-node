'use strict';
const path = require('path');
const { readFileSync, writeFileSync } = require('fs');
const { getAllDockerfiles, getDockerfileNodeVersion } = require('./utils');

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
  let initialFormat = base.replace(/^FROM.+$/m, `FROM ${baseImage}`)
    .replace(/^ENV NODE_VERSION=.+$/m, `ENV NODE_VERSION=${latestVersion}`)
    .replace(/^(\s*)"\${NODE_KEYS\[@]}".*$/m, formatKeys(nodeKeys))

  if (parseInt(nodeMajorVersion, 10) >= 26) {
    initialFormat = initialFormat.replace(/ENV YARN_VERSION.*\*\n/s, '');
  }

  if (template === templates.alpine) {
    initialFormat = initialFormat.replace(/CHECKSUM=CHECKSUM_x64/m, `CHECKSUM="${muslChecksum}"`);

    // Strip out rust and cargo packages for Node.js < 26
    if (parseInt(nodeMajorVersion, 10) < 26) {
      initialFormat = initialFormat.replace(/    rust \\.*cargo \\\s*/s, '');
    }
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
