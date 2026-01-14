import { promisify } from "util";

import child_process from "child_process";

const exec = promisify(child_process.exec);

// a function that queries the Node.js release website for new versions,
// compare the available ones with the ones we use in this repo
// and returns whether we should update or not
const checkIfThereAreNewVersions = async (github) => {
  try {
    const { stdout: versionsOutput } = await exec(". ./functions.sh && get_versions", { shell: "bash" });

    const supportedVersions = versionsOutput.trim().split(" ");

    let latestSupportedVersions = {};

    for (let supportedVersion of supportedVersions) {
      const { stdout } = await exec(`ls ${supportedVersion}`);
      const baseVersions = stdout.trim().split("\n");

      const debianVersion = baseVersions.find(v => !v.startsWith("alpine"));
      const { stdout: debianVersionOutput } = await exec(`. ./functions.sh && get_full_version ./${supportedVersion}/${debianVersion}`, { shell: "bash" });

      const alpineVersion = baseVersions.find(v => v.startsWith("alpine"));
      const { stdout: alpineVersionOutput } = await exec(`. ./functions.sh && get_full_version ./${supportedVersion}/${alpineVersion}`, { shell: "bash" });
      
      const fullVersion = { debian : debianVersionOutput.trim(), alpine: alpineVersionOutput.trim() };
      console.log(`${supportedVersion}: debian=${fullVersion.debian}, alpine=${fullVersion.alpine}`);

      latestSupportedVersions[supportedVersion] = {
        fullVersion: fullVersion.debian,
        alpineVersion: fullVersion.alpine,
        alpineIsBehind: fullVersion.debian !== fullVersion.alpine
      };
    }

    const { data: availableVersionsJson } = await github.request('https://nodejs.org/download/release/index.json');

    // filter only more recent versions of availableVersionsJson for each major version in latestSupportedVersions' keys
    // e.g. if latestSupportedVersions = { "12": "12.22.10", "14": "14.19.0", "16": "16.14.0", "17": "17.5.0" }
    // and availableVersions = ["Node.js 12.22.10", "Node.js 12.24.0", "Node.js 14.19.0", "Node.js 14.22.0", "Node.js 16.14.0", "Node.js 16.16.0", "Node.js 17.5.0", "Node.js 17.8.0"]
    // return { "12": "12.24.0", "14": "14.22.0", "16": "16.16.0", "17": "17.8.0" }

    let filteredNewerVersions = {};

    for (let availableVersion of availableVersionsJson) {
      const [availableMajor, availableMinor, availablePatch] = availableVersion.version.split("v")[1].split(".");
      if (latestSupportedVersions[availableMajor] == null) {
        continue;
      }

      const supported = latestSupportedVersions[availableMajor];
      const [_latestMajor, latestMinor, latestPatch] = supported.fullVersion.split(".");
      const [_alpineMajor, alpineMinor, alpinePatch] = supported.alpineVersion.split(".");

      const availableFullVersion = `${availableMajor}.${availableMinor}.${availablePatch}`;

      const newDebian = Number(availableMinor) > Number(latestMinor) || (availableMinor === latestMinor && Number(availablePatch) > Number(latestPatch));
      const newAlpine = Number(availableMinor) > Number(alpineMinor) || (availableMinor === alpineMinor && Number(availablePatch) > Number(alpinePatch));

      const isCatchup = supported.alpineIsBehind && newAlpine && availableFullVersion === supported.fullVersion;

      // Alpine will be always behind or equal to Debian
      // So if Debian is new version, then alpineOnly is always false. And vice versa
      if (newDebian || isCatchup) {
        filteredNewerVersions[availableMajor] = { 
          fullVersion: availableFullVersion, 
          alpineOnly: !newDebian 
        };
      }
    }

    return {
      shouldUpdate: Object.keys(filteredNewerVersions).length > 0 && JSON.stringify(filteredNewerVersions) !== JSON.stringify(latestSupportedVersions),
      versions: filteredNewerVersions,
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

// a function that queries the Node.js unofficial release website for new musl versions and security releases,
// and returns relevant information
const checkForMuslVersionsAndSecurityReleases = async (github, versions) => {
  try {
    const { data: unofficialBuildsIndexText } = await github.request('https://unofficial-builds.nodejs.org/download/release/index.json');

    for (let version of Object.keys(versions)) {
      const buildVersion = unofficialBuildsIndexText.find(indexVersion => indexVersion.version === `v${versions[version].fullVersion}`);

      versions[version].muslBuildExists = buildVersion?.files.includes("linux-x64-musl") ?? false;
      versions[version].isSecurityRelease = buildVersion?.security ?? false;
    }
    return versions;
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

export default async function(github) {
// if there are no new versions, exit gracefully
// if there are new versions,
// check for musl builds
// then run update.sh
  const { shouldUpdate, versions } = await checkIfThereAreNewVersions(github);

  if (!shouldUpdate) {
    console.log("No new versions found. No update required.");
    process.exit(0);
  } else {
    const newVersions = await checkForMuslVersionsAndSecurityReleases(github, versions);
    let updatedVersions = [];
    for (const [version, newVersion] of Object.entries(newVersions)) {
      if (newVersion.alpineOnly) {
        if (newVersion.muslBuildExists) {
          console.log(`Catch-up Alpine build for version ${newVersion.fullVersion}`);
          const { stdout } = await exec(`./update.sh ${version} alpine`);
          console.log(stdout);
          updatedVersions.push(`${newVersion.fullVersion} (alpine)`);
        } else {
          console.log(`There's no musl build for version ${newVersion.fullVersion} yet. Skipping Alpine catch-up.`);
        }
      } else if (newVersion.isSecurityRelease) {
        console.log(`Processing security release ${newVersion.fullVersion}`);
        const { stdout } = await exec(`./update.sh -s ${version}`);
        console.log(stdout);
        updatedVersions.push(newVersion.fullVersion);
      } else if (newVersion.muslBuildExists) {
        const { stdout } = await exec(`./update.sh ${version}`);
        console.log(stdout);
        updatedVersions.push(newVersion.fullVersion);
      } else {
        // No musl build - update non-alpine only
        console.log(`There's no musl build for version ${newVersion.fullVersion} yet. Updating non-alpine only.`);
        const { stdout } = await exec(`./update.sh ${version} bookworm,bookworm-slim,bullseye,bullseye-slim,trixie,trixie-slim`);
        console.log(stdout);
        updatedVersions.push(`${newVersion.fullVersion} (non-alpine)`);
      }
    }
    const { stdout } = (await exec(`git diff`));
    console.log(stdout);

    return updatedVersions.join(', ');
  }
}