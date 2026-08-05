import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import shell from 'shelljs';

// Track the built versions to output for the GitHub PR
const updatedVersions = [];

// TODO: since we have the full version, and could pass the CHECKSUM value (till
//       it goes Tier 2), the update.sh script shouldn't have to look it all up again
async function runUpdate(fullVersion, isSecurityRelease, hasMusl) {
  let majorVersion = fullVersion.split('v')[1].split('.')[0];
  if (hasMusl || isSecurityRelease) {
    let updateStatement = `bash update.sh ${isSecurityRelease ? '-s ' : ''}${majorVersion}`;
    console.log(`Updating ${fullVersion} with '${updateStatement}'.`);
    shell.exec(updateStatement);
    updatedVersions.push(fullVersion);
  } else {
    console.error(`There's no musl build for version ${fullVersion} yet.`);
  }
}

try {
  // get the folders with a digit, assuming they're the Node.js major versions
  const supportedVersions = readdirSync('./').filter((file) => {
    return file.match(/\d/);
  });

  console.log(`Found major versions in repo: ${supportedVersions}`);

  console.log('Grabbing Index.json files');
  const availableVersions = await fetch(
    'https://nodejs.org/download/release/index.json',
  );
  const officialIndexJson = await availableVersions.json();

  const unofficialVersions = await fetch(
    'https://unofficial-builds.nodejs.org/download/release/index.json',
  );
  const unofficialBuildsIndexJson = await unofficialVersions.json();

  for (let supportedVersion of supportedVersions) {
    console.log(`Checking for updates for ${supportedVersion}`);
    const folders = readdirSync(join('.', supportedVersion));

    const alpineFolder = folders[0];

    const alpineDockerFile = readFileSync(
      join('.', supportedVersion, alpineFolder, 'Dockerfile'),
      'utf-8',
    );
    const alpineVersion =
      'v' +
      alpineDockerFile.match(/NODE_VERSION=(?<version>\d*\.\d*\.\d)/).groups[
        'version'
      ];
    console.log(`Read Alpine version ${alpineVersion} from ${alpineFolder}`);

    const debianFolder = folders.at(-1);
    const debianDockerFile = readFileSync(
      join('.', supportedVersion, debianFolder, 'Dockerfile'),
      'utf-8',
    );

    const debianVersion =
      'v' +
      debianDockerFile.match(/NODE_VERSION=(?<version>\d*\.\d*\.\d)/).groups[
        'version'
      ];
    console.log(`Read Debian version ${alpineVersion} from ${debianFolder}`);

    let latestDebian = officialIndexJson.find((indexVersion) =>
      indexVersion.version.startsWith(`v${supportedVersion}`),
    );

    let hasMusl =
      unofficialBuildsIndexJson.find(
        (indexVersion) => indexVersion.version === latestDebian,
      ) !== null;

    if (latestDebian.version !== debianVersion) {
      console.warn(
        `Found new version ${latestDebian.version}, released on ${latestDebian.date}!`,
      );
      await runUpdate(latestDebian.version, latestDebian.security, hasMusl);
      console.warn(`Alpine and Debian versions do not match!`);
    } else if (debianVersion !== alpineVersion) {
      console.warn(`Alpine ${alpineVersion} ${latestDebian.version}!`);
      await runUpdate(latestDebian.version, latestDebian.security, hasMusl);
    } else {
      console.log(`Everything up to date for ${latestDebian.version}!
Released: ${latestDebian.date}
Security release: ${latestDebian.security}
Has musl: ${hasMusl}`);
    }
  }
  console.log('Finish the run.');
  updatedVersions.join(', ');
} catch (error) {
  console.error(error);
  process.exit(1);
}
