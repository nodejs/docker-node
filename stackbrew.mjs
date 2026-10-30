#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { execSync } from 'node:child_process';

// Grab last git commit
function getCommitHasForPath(path) {
  return execSync(`git log -1 --format=%H HEAD -- ${path}`).toString().trim();
}

// Grab nodejs/Release values as the authoritative start/maintenance/end dates
const releaseTimes = await fetch(
  'https://raw.githubusercontent.com/nodejs/Release/refs/heads/main/schedule.json',
);
const releaseJson = await releaseTimes.json();

// Grab the nodejs.org index.json as the authoritative Codename values, since that can lag the Release repo JSON
const availableVersions = await fetch(
  'https://nodejs.org/download/release/index.json',
);
const officialIndexJson = await availableVersions.json();

const stackbrewPath = basename(import.meta.filename);

// Header
let stackbrew = `# this file is generated via https://github.com/nodejs/docker-node/blob/${getCommitHasForPath(stackbrewPath)}/${stackbrewPath}

Maintainers: The Node.js Docker Team <https://github.com/nodejs/docker-node> (@nodejs)
GitRepo: https://github.com/nodejs/docker-node.git
GitFetch: refs/heads/main\n`;

const config = JSON.parse(readFileSync('versions.json'));

const localVersions = Object.keys(config).reverse();

let midnight = new Date();
midnight.setHours(0, 0, 0, 0);
const now = midnight.getTime();
let foundLTS = false;
let foundCurrent = false;

for (const majorVersion of localVersions) {
  let releaseRepoInfo = releaseJson[`v${majorVersion}`];
  let nodejsOrgReleaseInfo = officialIndexJson.find((indexVersion) =>
    indexVersion.version.startsWith(`v${majorVersion}`),
  );
  let currentStart = new Date(`${releaseRepoInfo.start}T00:00:00.00`).getTime();
  // First Alpha build is the only active one, and when the "start" of the release hasn't cut over
  let isAlpha = nodejsOrgReleaseInfo.version.includes('alpha');
  // The Current/Latest release is the first non-Alpha major that has hit it's "start" date
  let isCurrent = foundCurrent
    ? false
    : !isAlpha && (isNaN(currentStart) || now >= currentStart);
  foundCurrent |= isCurrent;
  let codename = nodejsOrgReleaseInfo.lts
    ? nodejsOrgReleaseInfo.lts.toLowerCase()
    : '';
  // The LTS tag is only set on the most recent LTS release
  let isLTS = foundLTS ? false : codename !== '';
  foundLTS |= isLTS;
  let defaultAlpine = config[majorVersion]['alpine-default'];
  let defaultDebian = config[majorVersion]['debian-default'];
  let defaultSlim = `${config[majorVersion]['debian-default']}-slim`;
  let variants = config[majorVersion].variants;
  for (const variant in variants) {
    let tags;

    if (isAlpha) {
      // Only push explicit variants during the Alpha phase
      tags = [`${nodejsOrgReleaseInfo.version.substring(1)}-${variant}`];
    } else {
      let fullVersion = nodejsOrgReleaseInfo.version.match(
        /v(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)/,
      );
      tags = [
        `${fullVersion.groups.major}.${fullVersion.groups.minor}.${fullVersion.groups.patch}-${variant}`,
        `${fullVersion.groups.major}.${fullVersion.groups.minor}-${variant}`,
        `${fullVersion.groups.major}-${variant}`,
      ];

      if (codename) {
        tags.push(`${codename}-${variant}`);
      }

      if (variant === defaultAlpine) {
        tags.push(
          `${fullVersion.groups.major}.${fullVersion.groups.minor}.${fullVersion.groups.patch}-alpine`,
        );
        tags.push(
          `${fullVersion.groups.major}.${fullVersion.groups.minor}-alpine`,
        );
        tags.push(`${fullVersion.groups.major}-alpine`);

        if (codename) {
          tags.push(`${codename}-alpine`);
        }

        if (isCurrent) {
          tags.push('alpine');
          tags.push('current-alpine');
        }

        if (isLTS) {
          tags.push(`lts-alpine`);
        }
      } else if (variant === defaultDebian) {
        tags.push(
          `${fullVersion.groups.major}.${fullVersion.groups.minor}.${fullVersion.groups.patch}`,
        );
        tags.push(`${fullVersion.groups.major}.${fullVersion.groups.minor}`);
        tags.push(`${fullVersion.groups.major}`);

        if (codename) {
          tags.push(`${codename}`);
        }

        if (isCurrent) {
          tags.push(variant);
          tags.push('latest');
          tags.push('current');
        }

        if (isLTS) {
          tags.push('lts');
          if (codename) {
            tags.push(`lts-${codename}`);
          }
        }
      } else if (variant === defaultSlim) {
        tags.push(
          `${fullVersion.groups.major}.${fullVersion.groups.minor}.${fullVersion.groups.patch}-slim`,
        );
        tags.push(
          `${fullVersion.groups.major}.${fullVersion.groups.minor}-slim`,
        );
        tags.push(`${fullVersion.groups.major}-slim`);

        if (codename) {
          tags.push(`${codename}-slim`);
        }

        if (isCurrent) {
          tags.push('slim');
          tags.push('current-slim');
        }

        if (isLTS) {
          tags.push(`lts-slim`);
        }
      }

      if (isCurrent) {
        tags.push(`${variant}`);
        tags.push(`current-${variant}`);
      }

      if (isLTS) {
        tags.push(`lts-${variant}`);
      }
    }

    stackbrew += `
Tags: ${tags
      .filter((x, i, a) => a.indexOf(x) == i)
      .sort()
      .join(', ')}
Architectures: ${config[majorVersion].variants[variant].join(', ')}
GitCommit: ${getCommitHasForPath(`${majorVersion}/${variant}`)}
Directory: ${`${majorVersion}/${variant}`}\n`;
  }
}

try {
  const outputFile = process.argv[2];

  if (outputFile) {
    writeFileSync(resolve(outputFile), stackbrew);
  } else {
    console.log(stackbrew);
  }
} catch (ex) {
  console.error("Couldn't handle output", ex);
}
