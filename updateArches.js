const { execFileSync } = require('child_process');
const { readFileSync, readdirSync, writeFileSync } = require('fs');
const path = require('path');

const nodeDirRegex = /^\d+$/;

// Given a name and a tag, this returns an array of architectures that it supports
const fetchImageArches = (repoTag) => execFileSync('bashbrew', [
  'cat', repoTag,
], { encoding: 'utf8' }).split('\n')
  .find((line) => line.startsWith('Architectures:'))
  .split(':')[1]
  .trim()
  .split(/\s*,\s*/);

// Parses an "architectures" file into an object like:
// {
//   arch1: ['variant1', 'variant2'],
//   //...
// }
const parseArchitecturesFile = (file) => Object.fromEntries(
  [...readFileSync(file, 'utf8').matchAll(/^(?<arch>\S+)\s+(?<variants>\S+)$/mg)]
    .slice(1)
    .map(({ groups: { arch, variants } }) => [arch, variants.split(',')]),
);

// Takes in an object like:
//   {
//     arch1: ['variant1', 'variant2'],
//     // ...
//   }
// and returns an object like
//   {
//     variant1: ['arch1', 'arch2'],
//     // ...
//   }
const invertObject = (obj) => Object.entries(obj)
  .reduce((acc, [key, vals]) => vals.reduce((valAcc, val) => {
    const { [val]: keys, ...rest } = valAcc;
    return {
      ...rest,
      [val]: keys
        ? [...keys, key]
        : [key],
    };
  }, acc), {});

// Returns a list of the child directories in the given path
const getChildDirectories = (parent) => readdirSync(parent, { withFileTypes: true })
  .filter((dirent) => dirent.isDirectory())
  .map(({ name }) => path.resolve(parent, name));

const getNodeVerionDirs = (base) => getChildDirectories(base)
  .filter((childPath) => nodeDirRegex.test(path.basename(childPath)));

// Assume no duplicates
const areArraysEquilivant = (arches1, arches2) => arches1.length === arches2.length
    && arches1.every((arch) => arches2.includes(arch));

// Returns the paths of Dockerfiles that are at: base/*/Dockerfile
const getDockerfilesInChildDirs = (base) => getChildDirectories(base)
  .map((childDir) => path.resolve(childDir, 'Dockerfile'));

// Given a path to a Dockerfile like .../14/variant/Dockerfile, this will return "variant"
const getVariantFromPath = (file) => path.dirname(file).split(path.sep).slice(-1);

const getBaseImageFromDockerfile = (file) => readFileSync(file, 'utf8')
  .match(/^FROM (\S+)/m)[1];

// Given a dockerfile, this function returns an array like [variant, [arch1, arch2, ...]]
const getVariantAndArches = (dockerfile) => {
  const variant = getVariantFromPath(dockerfile);
  const baseImage = getBaseImageFromDockerfile(dockerfile);
  const arches = fetchImageArches(baseImage);

  // TODO: filter by arches node supports
  return [variant, arches];
};

const getStoredVariantArches = (file) => {
  const storedArchVariants = parseArchitecturesFile(file);
  return invertObject(storedArchVariants);
};

const areVariantArchesEquilivant = (current, stored) => Object.keys(current).length
  === Object.keys(stored).length
    && Object.entries(current).every(
      ([variant, arches]) => stored[variant] && areArraysEquilivant(arches, stored[variant]),
    );

const formatEntry = ([arch, variants], variantOffset) => `${arch}${' '.repeat(variantOffset - arch.length)}${variants.join(',')}`;

const sortObjectKeys = (obj) => Object.keys(obj)
  .sort()
  .reduce((acc, key) => ({
    ...acc,
    [key]: obj[key]
  }), {});

const storeArchitectures = (variantArches, architecturesFile) => {
  const archVariants = sortObjectKeys(invertObject(variantArches));
  const data = {
    'bashbrew-arch': ['variants'],
    ...archVariants,
  };

  const maxKeyLength = Math.max(...Object.keys(data).map((key) => key.length));
  // Variants start 2 spaces after the longest key
  const variantOffset = maxKeyLength + 2;

  const str = Object.entries(data)
    .map((entry) => formatEntry(entry, variantOffset))
    .join('\n') + '\n';

  writeFileSync(architecturesFile, str);

  // Just here for debugging purposes
  console.log(str);
  console.log('\n\n');
};

const updateNodeDirArches = (nodeDir) => {
  const dockerfiles = getDockerfilesInChildDirs(nodeDir);

  const currentVariantArches = Object.fromEntries(dockerfiles.map(getVariantAndArches));
  const architecturesFile = path.resolve(nodeDir, 'architectures');
  const storedVariantArches = getStoredVariantArches(architecturesFile);

  if (areVariantArchesEquilivant(currentVariantArches, storedVariantArches)) {
    console.log('Architectures up-to-date: ', nodeDir);
    return false;
  }

  console.log('Architectures outdated: ', nodeDir);
  storeArchitectures(currentVariantArches, architecturesFile);

  return true;
};

const updateArchitectures = () => {
  const nodeDirs = getNodeVerionDirs(__dirname);
  const dirsUpdated = nodeDirs.map(updateNodeDirArches);
  return dirsUpdated.some((updated) => updated);
};

module.exports = updateArchitectures;
