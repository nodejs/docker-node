const path = require('path');
const fs = require('fs');

const testFiles = [
  'functions.sh',
  'test-build.sh',
  'test-image.bats',
];

const nodeDirRegex = /^\d+$/;

const areTestFilesChanged = (changedFiles) => changedFiles
  .filter((file) => testFiles.includes(file)).length;

// Returns a list of the child directories in the given path
const getChildDirectories = (parent) => fs.readdirSync(parent, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map(({ name }) => path.resolve(parent, name));


const getNodeVerionDirs = (base) => getChildDirectories(base)
  .filter((childPath) => nodeDirRegex.test(path.basename(childPath)));

// Returns the paths of Dockerfiles that are at: base/*/Dockerfile
const getDockerfilesInChildDirs = (base) => getChildDirectories(base)
    .map((childDir) => path.resolve(childDir, 'Dockerfile'));

const getAllDockerfiles = (base) => getNodeVerionDirs(base).flatMap(getDockerfilesInChildDirs);

// Get the Dockerfiles affected by the architectures file
const getArchAffectedDockerfiles = (archFile) => getDockerfilesInChildDirs(path.dirname(archFile));

const getAffectedDockerfiles = (filesAdded, filesModified, filesRenamed) => {
  const files = [
    ...filesAdded,
    ...filesModified,
    ...filesRenamed,
  ];

  // If the test files were changed, include everything
  if (areTestFilesChanged(files)) {
    console.log('Test files changed so scheduling all Dockerfiles');
    return getAllDockerfiles(__dirname);
  }

  const dockerfiles = files.filter((file) => file.endsWith('/Dockerfile'));

  // Look Dockerfiles affected by changed architectures files
  const archAffectedFiles = files.filter((file) => file.endsWith('/architectures'))
    .flatMap(getArchAffectedDockerfiles);

  return [
    ...dockerfiles,
    ...archAffectedFiles,
  ];
};

// Parses an arch line like:
// amd64    stretch,stretch-slim
// Into ["amd64", ["stretch", "stretch-slim"]]
const parseArchLine = (line) => {
  const [arch, rawVariants] = line.split(/\s+/);
  const variants = rawVariants.split(',');

  return [
    arch,
    variants
  ];
};

// Parses an architectures file into an object like:
// {
//   "amd64": ["stretch", "stretch-slim"],
//   // ....
// }
const parseArchFile = (file) => Object.fromEntries(
  fs.readFileSync(file, { encoding: 'utf8' })
    .split('\n')
    .slice(1)
    .filter((line) => line)
    .map(parseArchLine),
);

// Given a Dockerfile path, this function returns an array of the supported arches
const getDockerfileArches = (file, variant) => {
  const archVariants = parseArchFile(path.resolve(path.dirname(file), '../architectures'));
  return Object.keys(archVariants).filter((arch) => archVariants[arch].includes(variant));
};

const getDockerfileMatrixEntries = (file) => {
  const [version, variant] = path.dirname(file).split(path.sep).slice(-2);
  const supportedArches = getDockerfileArches(file, variant);

  return supportedArches.map((arch) => ({
    version,
    variant,
    arch,
  }));
};

const generateBuildMatrix = (filesAdded, filesModified, filesRenamed) => {
  // The Dockerfile paths contain the version in variant.
  const dockerfiles = [...new Set(getAffectedDockerfiles(filesAdded, filesModified, filesRenamed))];

  const entries = dockerfiles.flatMap(getDockerfileMatrixEntries);
  return entries.length
    ? { include: entries }
    : null;
};

module.exports = generateBuildMatrix;
