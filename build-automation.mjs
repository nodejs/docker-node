import { promisify } from 'util';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import child_process from 'child_process';

const exec = promisify(child_process.exec);

// a function that queries the Node.js release website for new versions,
// compare the available ones with the ones we use in this repo
// and returns whether we should update or not
const checkIfThereAreNewVersions = async () => {
  try {
    let files = readdirSync('./');
    // get the folders with a digit, assuming they're the Node.js major versions
    const supportedVersions = files.filter((file) => {
      return file.match(/\d/);
    });

    let latestSupportedVersions = {};

    for (let supportedVersion of supportedVersions) {
      // Grab the Alpine folder, to assume it is more likely to be behind after a Security release
      const alpinefolder = readdirSync(join('.', supportedVersion)).find(
        (folder) => folder.startsWith('alpine'),
      );

      const fullVersionOutput = readFileSync(
        join('.', supportedVersion, alpinefolder, 'Dockerfile'),
        'utf-8',
      );

      latestSupportedVersions[supportedVersion] = {
        fullVersion: fullVersionOutput.match(
          /NODE_VERSION=(?<version>\d*\.\d*\.\d)/,
        ).groups['version'],
      };
    }

    const availableVersions = await fetch(
      'https://nodejs.org/download/release/index.json',
    );
    const availableVersionsJson = await availableVersions.json();

    let filteredNewerVersions = {};

    for (let availableVersion of availableVersionsJson) {
      const [availableMajor, availableMinor, availablePatch] =
        availableVersion.version.split('v')[1].split('.');
      if (latestSupportedVersions[availableMajor] == null) {
        continue;
      }
      const [_latestMajor, latestMinor, latestPatch] =
        latestSupportedVersions[availableMajor].fullVersion.split('.');
      if (
        latestSupportedVersions[availableMajor] &&
        (Number(availableMinor) > Number(latestMinor) ||
          (availableMinor === latestMinor &&
            Number(availablePatch) > Number(latestPatch)))
      ) {
        filteredNewerVersions[availableMajor] = {
          fullVersion: `${availableMajor}.${availableMinor}.${availablePatch}`,
          isSecurityRelease: availableVersion.security,
        };
      }
    }

    return {
      shouldUpdate:
        Object.keys(filteredNewerVersions).length > 0 &&
        JSON.stringify(filteredNewerVersions) !==
          JSON.stringify(latestSupportedVersions),
      versions: filteredNewerVersions,
    };
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

// a function that queries the Node.js unofficial release website for new musl versions and security releases,
// and returns relevant information
const checkForMuslVersionsAndSecurityReleases = async (versions) => {
  try {
    const unofficialBuildsIndex = await fetch(
      'https://unofficial-builds.nodejs.org/download/release/index.json',
    );
    const unofficialBuildsIndexText = await unofficialBuildsIndex.json();

    for (let version of Object.keys(versions)) {
      const buildVersion = unofficialBuildsIndexText.find(
        (indexVersion) =>
          indexVersion.version === `v${versions[version].fullVersion}`,
      );

      versions[version].muslBuildExists =
        buildVersion?.files.includes('linux-x64-musl') ?? false;
    }
    return versions;
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

export default async function () {
  // if there are no new versions, exit gracefully
  // if there are new versions,
  // check for musl builds
  // then run update.sh
  const { shouldUpdate, versions } = await checkIfThereAreNewVersions();

  if (!shouldUpdate) {
    console.log('No new versions found. No update required.');
    process.exit(0);
  } else {
    const newVersions = await checkForMuslVersionsAndSecurityReleases(versions);
    let updatedVersions = [];
    for (const [version, newVersion] of Object.entries(newVersions)) {
      if (newVersion.muslBuildExists || newVersion.isSecurityRelease) {
        console.log(`Updating ${newVersion.fullVersion}.`);
        const { stdout } = await exec(
          `./update.sh ${newVersion.isSecurityRelease ? '-s ' : ''}${version}`,
        );
        console.log(stdout);
        updatedVersions.push(newVersion.fullVersion);
      } else {
        console.log(
          `There's no musl build for version ${newVersion.fullVersion} yet.`,
        );
        process.exit(0);
      }
    }
    return updatedVersions.join(', ');
  }
}
