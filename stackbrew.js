#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Grab last git commit
function getCommitHasForPath(path) {
  return require('child_process')
  .execSync(`git log -1 --format=%H HEAD -- ${path}`)
  .toString().trim()
}

const stackbrewPath = path.basename(__filename);

// Header
let stackbrew = `# this file is generated via https://github.com/nodejs/docker-node/blob/${getCommitHasForPath(stackbrewPath)}/${stackbrewPath}

Maintainers: The Node.js Docker Team <https://github.com/nodejs/docker-node> (@nodejs)
GitRepo: https://github.com/nodejs/docker-node.git
GitFetch: refs/heads/main\n`;

// Loop versions

const config = require('./versions.json');

const versions = Object.keys(config).reverse()

let midnight = new Date()
midnight.setHours(0, 0, 0, 0)
const now = midnight.getTime()
const alpineRE = new RegExp(/alpine*/);
const slimRE = new RegExp(/\*-slim/);
let foundLTS = false;
let foundCurrent = false;

for (const version of versions) {
  let lts = new Date(`${config[version].lts}T00:00:00.00`).getTime();
  let isCurrent = foundCurrent ? false : isNaN(lts) || lts >= now;
  foundCurrent = isCurrent || foundCurrent;
  let isLTS = foundLTS ? false : (now >= lts);
  foundLTS = isLTS || foundLTS;
  let codename = config[version].codename
  let defaultAlpine = config[version]['alpine-default']
  let defaultDebian = config[version]['debian-default']
  let variants = config[version].variants
  for (const variant in variants) {
    let dockerfilePath = path.join(version, variant, 'Dockerfile');
    let isAlpine = alpineRE.test(variant)
    let isSlim = slimRE.test(variant)
    let isDefaultSlim = new RegExp(`${defaultDebian}-slim`).test(variant)

    // Get full version from the Dockerfile
    let dockerfile = fs.readFileSync(dockerfilePath, 'utf-8')
    let fullVersion = dockerfile.match(/ENV NODE_VERSION=(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)/)

    let tags = [
      `${fullVersion.groups.major}.${fullVersion.groups.minor}.${fullVersion.groups.patch}-${variant}`,
      `${fullVersion.groups.major}.${fullVersion.groups.minor}-${variant}`,
      `${fullVersion.groups.major}-${variant}`,
    ]

    if (codename) {
      tags.push(`${codename}-${variant}`)
    }

    if (variant === defaultAlpine) {
      tags.push(`${fullVersion.groups.major}.${fullVersion.groups.minor}.${fullVersion.groups.patch}-alpine`)
      tags.push(`${fullVersion.groups.major}.${fullVersion.groups.minor}-alpine`)
      tags.push(`${fullVersion.groups.major}-alpine`)
      if (codename) {
        tags.push(`${codename}-alpine`)
      }
    }

    if (variant === defaultDebian) {
      tags.push(`${fullVersion.groups.major}.${fullVersion.groups.minor}.${fullVersion.groups.patch}`)
      tags.push(`${fullVersion.groups.major}.${fullVersion.groups.minor}`)
      tags.push(`${fullVersion.groups.major}`)
      if (isSlim) {
        tags.push(`${fullVersion.groups.major}.${fullVersion.groups.minor}.${fullVersion.groups.patch}-slim`)
        tags.push(`${fullVersion.groups.major}.${fullVersion.groups.minor}-slim`)
        tags.push(`${fullVersion.groups.major}-slim`)
      }
      if (codename) {
        tags.push(`${codename}`)
      }
    }
    if (isDefaultSlim) {
      tags.push(`${fullVersion.groups.major}.${fullVersion.groups.minor}.${fullVersion.groups.patch}-slim`)
      tags.push(`${fullVersion.groups.major}.${fullVersion.groups.minor}-slim`)
      tags.push(`${fullVersion.groups.major}-slim`)
      if (codename) {
        tags.push(`${codename}-slim`)
      }
    }

    if (isCurrent) {
      if (variant === defaultAlpine) {
        tags.push(variant)
        tags.push(`${fullVersion.groups.major}.${fullVersion.groups.minor}.${fullVersion.groups.patch}-alpine`)
        tags.push(`${fullVersion.groups.major}.${fullVersion.groups.minor}-alpine`)
        tags.push(`${fullVersion.groups.major}-alpine`)
        tags.push('alpine')
        tags.push('current-alpine')
      }
      if (variant === defaultDebian) {
        tags.push(variant)
        tags.push('latest')
        tags.push('current')
      }
      if (isAlpine) {
        tags.push(`${variant}`)
        tags.push(`current-${variant}`)
      }
      if (!isAlpine) {
        tags.push(`${variant}`)
        tags.push(`current-${variant}`)
      }
      if (isDefaultSlim) {
        tags.push('slim')
        tags.push('current-slim')
      }
    }

    if (isLTS) {
      tags.push(`lts-${variant}`)
      if (variant === defaultDebian) {
        tags.push('lts')
        if (codename) {
          tags.push(`lts-${codename}`)
        }
      }
      if (isDefaultSlim) {
        tags.push(`lts-slim`)
      }
      if (variant === defaultAlpine) {
        tags.push(`lts-alpine`)
      }
    }

    // remove duplicates
    tags = tags.filter((x, i, a) => a.indexOf(x) == i)
    tags = tags.sort()
    let directory = `${version}/${variant}`
    stackbrew += `\nTags: ${tags.join(', ')}\n`
    stackbrew += `Architectures: ${config[version].variants[variant].join(', ')}\n`
    stackbrew += `GitCommit: ${getCommitHasForPath(directory)}\n`
    stackbrew += `Directory: ${directory}\n`
  }
}

// output
console.log(stackbrew)
