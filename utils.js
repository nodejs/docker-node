'use strict';
const path = require('path');
const { readFileSync, readdirSync } = require('fs');

const nodeDirRegex = /^\d+$/;

// Returns a list of the child directories in the given path
const getChildDirectories = (parent) => readdirSync(parent, { withFileTypes: true })
  .filter((dirent) => dirent.isDirectory())
  .map(({ name }) => path.resolve(parent, name));

const getNodeVersionDirs = (base) => getChildDirectories(base)
  .filter((childPath) => nodeDirRegex.test(path.basename(childPath)));

// Returns the paths of Dockerfiles that are at: base/*/Dockerfile
const getDockerfilesInChildDirs = (base) => getChildDirectories(base)
  .map((childDir) => path.resolve(childDir, 'Dockerfile'));

const getAllDockerfiles = (base) => getNodeVersionDirs(base).flatMap(getDockerfilesInChildDirs);

const getDockerfileNodeVersion = (file) => readFileSync(file, 'utf8')
  .match(/^ENV NODE_VERSION (\d*\.*\d*\.\d*)/m)[1];

module.exports = {
  getAllDockerfiles,
  getDockerfileNodeVersion,
};
