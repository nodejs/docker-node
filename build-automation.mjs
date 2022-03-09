import { promisify } from "util";

import child_process from "child_process";

const exec = promisify(child_process.exec);

// a function that queries the Node.js release website for new versions,
// compare the available ones with the ones we use in this repo
// and returns whether we should update or not
const checkIfThereAreNewVersions = async () => {
  try {
    const { stdout: versionsOutput } = await exec(". ./functions.sh && get_versions", { shell: "bash" });

    const supportedVersions = versionsOutput.trim().split(" ");

    let lsOutput = "";
    let latestSupportedVersions = {};

    for (let supportedVersion of supportedVersions) {
      lsOutput = (await exec(`ls ${supportedVersion}`)).stdout;

      const { stdout: fullVersionOutput } = await exec(`. ./functions.sh && get_full_version ./${supportedVersion}/${lsOutput.trim().split("\n")[0]}`, { shell: "bash" });

      console.log(fullVersionOutput);

      latestSupportedVersions[supportedVersion] = { fullVersion: fullVersionOutput.trim() };
    }

    const availableVersionsJson = await (await fetch('https://nodejs.org/download/release/index.json')).json();

    // filter only more recent versions of availableVersionsJson for each major version in latestSupportedVersions' keys
    // e.g. if latestSupportedVersions = { "12": "12.22.10", "14": "14.19.0", "16": "16.14.0", "17": "17.5.0" }
    // and availableVersions = ["Node.js 12.22.10", "Node.js 12.24.0", "Node.js 14.19.0", "Node.js 14.22.0", "Node.js 16.14.0", "Node.js 16.16.0", "Node.js 17.5.0", "Node.js 17.8.0"]
    // return { "12": "12.24.0", "14": "14.22.0", "16": "16.16.0", "17": "17.8.0" }

    let filteredNewerVersions = {};

    for (let availableVersion of availableVersionsJson) {
      const [availableMajor, availableMinor, availablePatch] = availableVersion.version.split("v")[1].split(".");
      const [_latestMajor, latestMinor, latestPatch] = latestSupportedVersions[availableMajor].fullVersion.split(".");
      if (latestSupportedVersions[availableMajor] && (Number(availableMinor) > Number(latestMinor) || (availableMinor === latestMinor && Number(availablePatch) > Number(latestPatch)))) {
        filteredNewerVersions[availableMajor] = { fullVersion: `${availableMajor}.${availableMinor}.${availablePatch}` };
        continue
      }
    }

    return {
      shouldUpdate: Object.keys(filteredNewerVersions).length > 0 && JSON.stringify(filteredNewerVersions) !== JSON.stringify(latestSupportedVersions),
      versions: filteredNewerVersions,
    }
  } catch (error) {
    console.error(error);
  }
};

// a function that queries the Node.js unofficial release website for new musl versions and security releases,
// and returns relevant information
const checkForMuslVersionsAndSecurityReleases = async (versions) => {
  try {
    let unofficialBuildsIndexText = await (await fetch('https://unofficial-builds.nodejs.org/download/release/index.json')).json();

    let unofficialBuildsWebsiteText = "";
    for (let version of Object.keys(versions)) {
      unofficialBuildsWebsiteText = await (await fetch(`https://unofficial-builds.nodejs.org/download/release/v${versions[version].fullVersion}`)).text();
      versions[version].muslBuildExists = unofficialBuildsWebsiteText.includes("musl");

      versions[version].isSecurityRelease = unofficialBuildsIndexText.find(indexVersion => indexVersion.version === `v${versions[version].fullVersion}`)?.security;
    }
    return versions;
  } catch (error) {
    console.error(error);
  }
};

// if there are no new versions, exit gracefully
// if there are new versions,
// check for musl builds
// then run update.sh
const { shouldUpdate, versions } = await checkIfThereAreNewVersions();

if (!shouldUpdate) {
  console.log("No new versions found. No update required.");
  process.exit(0);
} else {
  const newVersions = await checkForMuslVersionsAndSecurityReleases(versions);
  let updatedVersions = [];
  for (let version of Object.keys(newVersions)) {
    if (newVersions[version].muslBuildExists) {
      const { stdout } = await exec(`./update.sh ${newVersions[version].isSecurityRelease ? "-s " : ""}${version}`);
      console.log(stdout);
      updatedVersions.push(newVersions[version].fullVersion);
    } else {
      console.log(`There's no musl build for version ${newVersions[version].fullVersion} yet.`);
    }
  };
  console.log(`::set-output name=updated-versions::${updatedVersions.join(',')}`);
  const { stdout } = (await exec(`git diff`));
  console.log(stdout);
}
