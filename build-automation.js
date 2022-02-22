const util = require("util")

const exec = util.promisify(require("child_process").exec);

const https = require("https");

// a function that takes an URL as argument and makes a request to that URL
// returning the response as a promise
const request = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
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

      latestSupportedVersions[supportedVersion] = fullVersionOutput.trim();
    }

    // filter only more recent versions of availableVersions for each major version in latestSupportedVersions' keys
    // e.g. if latestSupportedVersions = { "12": "12.22.10", "14": "14.19.0", "16": "16.14.0", "17": "17.5.0" }
    // and availableVersions = ["Node.js 12.22.10", "Node.js 12.24.0", "Node.js 14.19.0", "Node.js 14.22.0", "Node.js 16.14.0", "Node.js 16.16.0", "Node.js 17.5.0", "Node.js 17.8.0"]
    // return { "12": "12.24.0", "14": "14.22.0", "16": "16.16.0", "17": "17.8.0" }
    
    const filteredNewerVersions = latestSupportedVersions;
    for (let availableVersion of availableVersions) {
      if (availableVersion.includes("Node.js ")) {
        const [availableMajor, availableMinor, availablePatch] = availableVersion.split(" ")[1].split(".");
        const [_latestMajor, latestMinor, latestPatch] = filteredNewerVersions[availableMajor].split(".");
        if (filteredNewerVersions[availableMajor] && (Number(availableMinor) > Number(latestMinor) || (availableMinor === latestMinor && Number(availablePatch) > Number(latestPatch)))) {
          console.log(availableMajor, availableMinor, availablePatch, _latestMajor, latestMinor, latestPatch, availableMinor > latestMinor, (availableMinor === latestMinor && availablePatch > latestPatch));
          filteredNewerVersions[availableMajor] = `${availableMajor}.${availableMinor}.${availablePatch}`;
          continue
        }
      }
    }
    
    return JSON.stringify(filteredNewerVersions) !== JSON.stringify(latestSupportedVersions);
  } catch (error) {
    console.log(error);
  }
};

(async () => {
  const shouldUpdate = await checkIfThereAreNewVersions();
  console.log(shouldUpdate);
})();
