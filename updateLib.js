'use strict';
const https = require('https');
const path = require('path');
const { readFileSync, writeFileSync } = require('fs');
const { getAllDockerfiles, getDockerfileNodeVersion } = require('./utils');

const releaseUrl = 'https://nodejs.org/dist/index.json';
const yarnVersionUrl = 'https://classic.yarnpkg.com/latest-version';

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

const fetchText = (url) => new Promise((resolve, reject) => {
  https.get(url, (res) => {
    const { statusCode } = res;

    if (statusCode < 200 || statusCode >= 300) {
      // Consume response data to free up memory
      res.resume();
      reject(new Error(`Request Failed.\nStatus Code: ${statusCode}`));
      return;
    }

    res.setEncoding('utf8');
    let rawData = '';
    res.on('data', (chunk) => {
      rawData += chunk;
    });

    res.on('end', () => {
      resolve(rawData);
    });
  }).on('error', (e) => {
    reject(e);
  }).end();
});

const fetchJson = async (url) => {
  const text = await fetchText(url);
  return JSON.parse(text);
};

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
  const nodeDist = await fetchJson(releaseUrl);
  return nodeDist.map(({ version }) => version.substring(1));
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

const formatTemplate = (yarnVersion, nodeKeys, yarnKeys, muslChecksum, base, metadata) => {
  const { latestVersion, template, nodeMajorVersion } = metadata;
  const baseImage = getBaseImage(metadata);
  const initialFormat = base.replace(/^FROM.+$/m, `FROM ${baseImage}`)
    .replace(/^ENV NODE_VERSION .+$/m, `ENV NODE_VERSION ${latestVersion}`)
    .replace(/^ENV YARN_VERSION .+$/m, `ENV YARN_VERSION ${yarnVersion}`)
    .replace(/^(\s*)"\${NODE_KEYS\[@]}".*$/m, formatKeys(nodeKeys))
    .replace(/^(\s*)"\${YARN_KEYS\[@]}".*$/m, formatKeys(yarnKeys));

  if (template !== templates.alpine) {
    return initialFormat;
  }

  const pythonVersion = parseInt(nodeMajorVersion, 10) < 14
    ? 'python2'
    : 'python3';

  return initialFormat.replace(/\${PYTHON_VERSION}/m, pythonVersion)
    .replace(/CHECKSUM=CHECKSUM_x64/m, `CHECKSUM="${muslChecksum}"`);
};

const fetchMuslChecksum = async (nodeVersion) => {
  const checksums = await fetchText(
    `https://unofficial-builds.nodejs.org/download/release/v${nodeVersion}/SHASUMS256.txt`,
  );
  return checksums.match(/(\S+)\s+\S+-linux-x64-musl.tar.xz/m)[1];
};

const updateDockerfile = async (yarnVersion, nodeKeys, yarnKeys, metadata) => {
  const { file, template, latestVersion } = metadata;
  const base = readTemplate(template);
  const muslChecksum = await fetchMuslChecksum(latestVersion);

  const formatted = formatTemplate(yarnVersion, nodeKeys, yarnKeys, muslChecksum, base, metadata);
  writeFileSync(file, formatted);
};

const updateDockerfiles = async (outdated) => {
  const yarnVersion = await fetchText(yarnVersionUrl);
  const nodeKeys = getKeys('node.keys');
  const yarnKeys = getKeys('yarn.keys');

  await Promise.all(
    outdated.map((metadata) => updateDockerfile(yarnVersion, nodeKeys, yarnKeys, metadata)),
  );
};

const update = async (updateAll) => {
  const outdated = await findOutdated(updateAll);
  await updateDockerfiles(outdated);
  return outdated;
};

module.exports = update;
