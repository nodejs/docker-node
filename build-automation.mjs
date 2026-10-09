import { promisify } from 'util';

import child_process from 'child_process';

const exec = promisify(child_process.exec);

// a function that queries the Node.js release website for new versions,
// compare the available ones with the ones we use in this repo
// and returns whether we should update or not
const checkIfThereAreNewVersions = async (github) => {
  try {
    const { stdout: versionsOutput } = await exec(
      '. ./functions.sh && get_versions',
      { shell: 'bash' },
    );

    const supportedVersions = versionsOutput.trim().split(' ');

    let latestSupportedVersions = {};

    for (let supportedVersion of supportedVersions) {
      const { stdout } = await exec(`ls ${supportedVersion}`);

      const { stdout: fullVersionOutput } = await exec(
        `. ./functions.sh && get_full_version ./${supportedVersion}/${stdout.trim().split('\n')[0]}`,
        { shell: 'bash' },
      );

      console.log(fullVersionOutput);

      latestSupportedVersions[supportedVersion] = {
        fullVersion: fullVersionOutput.trim(),
      };
    }

    const { data: availableVersionsJson } = await github.request(
      'https://nodejs.org/download/release/index.json',
    );

    // filter only more recent versions of availableVersionsJson for each major version in latestSupportedVersions' keys
    // e.g. if latestSupportedVersions = { "12": "12.22.10", "14": "14.19.0", "16": "16.14.0", "17": "17.5.0" }
    // and availableVersions = ["Node.js 12.22.10", "Node.js 12.24.0", "Node.js 14.19.0", "Node.js 14.22.0", "Node.js 16.14.0", "Node.js 16.16.0", "Node.js 17.5.0", "Node.js 17.8.0"]
    // return { "12": "12.24.0", "14": "14.22.0", "16": "16.16.0", "17": "17.8.0" }

    let filteredNewerVersions = {};

    for (let availableVersion of availableVersionsJson) {
      const [availableMajor, availableMinor, availablePatch] =
        availableVersion.version.split('v')[1].split('.');
      if (latestSupportedVersions[availableMajor] == null) {
        continue;
      }
      // eslint-disable-next-line no-unused-vars
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

export default async function (github) {
  // if there are no new versions, exit gracefully
  // if there are new versions, run update.sh
  const { shouldUpdate, versions } = await checkIfThereAreNewVersions(github);

  if (!shouldUpdate) {
    console.log('No new versions found. No update required.');
    process.exit(0);
  } else {
    let updatedVersions = [];
    for (const [version, newVersion] of Object.entries(versions)) {
      const { stdout } = await exec(`./update.sh ${version}`);
      console.log(stdout);
      updatedVersions.push(newVersion.fullVersion);
    }

    if (updatedVersions.length === 0) {
      console.log('No versions with musl builds were updated.');
      process.exit(0);
    }

    const { stdout } = await exec(`git diff`);
    console.log(stdout);

    return updatedVersions.join(', ');
  }
}
