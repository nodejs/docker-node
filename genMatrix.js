'use strict';
const path = require('path');
const { getAllDockerfiles, getDockerfileNodeVersion } = require('./utils');

const testFiles = [
  'genMatrix.js',
  '.github/workflows/build-test.yml',
];

const areTestFilesChanged = (changedFiles) => changedFiles
  .some((file) => testFiles.includes(file));

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

  const modifiedDockerfiles = files.filter((file) => file.endsWith('/Dockerfile'));

  // Get Dockerfiles affected by modified docker-entrypoint.sh files
  const entrypointAffectedDockerfiles = files
    .filter((file) => file.endsWith('/docker-entrypoint.sh'))
    .map((file) => path.resolve(path.dirname(file), 'Dockerfile'));

  return [
    ...modifiedDockerfiles,
    ...entrypointAffectedDockerfiles,
  ];
};

const getDockerfileMatrixEntry = (file) => {
  const [variant] = path.dirname(file).split(path.sep).slice(-1);

  const version = getDockerfileNodeVersion(file);

  return {
    version,
    variant,
  };
};

const generateBuildMatrix = (filesAdded, filesModified, filesRenamed) => {
  const dockerfiles = [...new Set(getAffectedDockerfiles(filesAdded, filesModified, filesRenamed))];

  const entries = dockerfiles.map(getDockerfileMatrixEntry);

  // Return null if there are no entries so we can skip the matrix step
  return entries.length
    ? { include: entries }
    : null;
};

module.exports = generateBuildMatrix;
