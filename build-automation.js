const util = require("util")

const exec = util.promisify(require("child_process").exec);

const https = require("https");

// a function that takes an URL as argument and makes a request to that URL
// returning the response as a promise
const request = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, async (res) => {
      let body = '';

      if(res.statusCode === 301 || res.statusCode === 302) {
        resolve(await request(res.headers.location, resolve, reject));
      }

      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        if (res.statusCode < 400) {
          resolve(body);
        } else {
          reject(new Error(`Request failed: ${res.statusCode}`));
        }
      })
    });
  });
};

// a function that queries the Node.js release website for new versions,
// compare the available ones with the ones we use in this repo
// and returns whether we should update or not
const checkIfThereAreNewVersions = async () => {
  try {
    const nodeWebsite = await request('https://nodejs.org/en/download/releases/');
    const nodeWebsiteText = nodeWebsite.toString();

    const { stdout: versionsOutput } = await exec(". functions.sh && get_versions .");

    const supportedVersions = versionsOutput.trim().split(" ");

    const availableVersions = nodeWebsiteText.match(new RegExp("Node\\.js (" + supportedVersions.join('|') + ")\\.\\d+\\.\\d+", "g"));

    let lsOutput = "";
    let latestSupportedVersions = {};

    for (let supportedVersion of supportedVersions) {
      lsOutput = (await exec(`ls ${supportedVersion}`)).stdout;

      const { stdout: fullVersionOutput } = await exec(`. functions.sh && get_full_version ./${supportedVersion}/${lsOutput.trim().split("\n")[0]}`);

      latestSupportedVersions[supportedVersion] = { fullVersion: fullVersionOutput.trim() };
    }

    // filter only more recent versions of availableVersions for each major version in latestSupportedVersions' keys
    // e.g. if latestSupportedVersions = { "12": "12.22.10", "14": "14.19.0", "16": "16.14.0", "17": "17.5.0" }
    // and availableVersions = ["Node.js 12.22.10", "Node.js 12.24.0", "Node.js 14.19.0", "Node.js 14.22.0", "Node.js 16.14.0", "Node.js 16.16.0", "Node.js 17.5.0", "Node.js 17.8.0"]
    // return { "12": "12.24.0", "14": "14.22.0", "16": "16.16.0", "17": "17.8.0" }

    let filteredNewerVersions = {};

    for (let availableVersion of availableVersions) {
      if (availableVersion.includes("Node.js ")) {
        const [availableMajor, availableMinor, availablePatch] = availableVersion.split(" ")[1].split(".");
        const [_latestMajor, latestMinor, latestPatch] = latestSupportedVersions[availableMajor].fullVersion.split(".");
        if (latestSupportedVersions[availableMajor] && (Number(availableMinor) > Number(latestMinor) || (availableMinor === latestMinor && Number(availablePatch) > Number(latestPatch)))) {
          filteredNewerVersions[availableMajor] = { fullVersion: `${availableMajor}.${availableMinor}.${availablePatch}` };
          continue
        }
      }
    }

    return {
      shouldUpdate: JSON.stringify(filteredNewerVersions) !== JSON.stringify(latestSupportedVersions),
      versions: filteredNewerVersions,
    }
  } catch (error) {
    console.log(error);
  }
};

// a function that queries the Node.js unofficial release website for new musl versions and security releases,
// and returns relevant information
const checkForMuslVersionsAndSecurityReleases = async (versions) => {
  try {
    let unofficialBuildsIndexText = JSON.parse(await request('https://unofficial-builds.nodejs.org/download/release/index.json'));

    let unofficialBuildsWebsiteText = "";
    for (let version of Object.keys(versions)) {
      unofficialBuildsWebsiteText = await request(`https://unofficial-builds.nodejs.org/download/release/v${versions[version].fullVersion}`);
      versions[version].muslBuildExists = unofficialBuildsWebsiteText.includes("musl");

      versions[version].isSecurityRelease = unofficialBuildsIndexText.find(indexVersion => indexVersion.version === `v${versions[version].fullVersion}`)?.security;
    }
    return versions;
  } catch (error) {
    console.log(error);
  }
};

// if there are no new versions, exit gracefully
(async () => {
  const { shouldUpdate, versions } = await checkIfThereAreNewVersions();
  if (!shouldUpdate) {
    process.exit(0);
  } else {
    // let ranUpdates = false;
    const newVersions = await checkForMuslVersionsAndSecurityReleases(versions);
    for (let version of newVersions) {
      if (version.muslBuildExists) {
        const { stdout } = await exec(`./update.sh ${version.isSecurityRelease ? "-s" : ""} ${version}`);
        // ranUpdates = true;
        console.log(stdout);
      } else {
        console.log(`There's no musl build for version ${version.fullVersion} yet.`);
      }
    };
    // if (!ranUpdates) {
    //   process.exit(0);
    // }
  }
})();
