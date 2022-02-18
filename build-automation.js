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

const getLatestVersions = async () => {
  try {
    // const nodeWebsite = await request('https://nodejs.org/en/download/releases/');
    // const nodeWebsiteText = nodeWebsite.toString();

    // const { stdout: versionsOutput } = await exec(". functions.sh && get_versions .");

    // const supportedVersions = versionsOutput.trim().split(" ");

    // const availableVersions = nodeWebsiteText.match(new RegExp("Node\\.js (" + supportedVersions.join('|') + ")\\.\\d+\\.\\d+", "g"));

    const { stdout: latestVersionsOutput, stderr } = await exec(". functions.sh && get_full_version ./16/bullseye");

    console.log(latestVersionsOutput.trim());
    console.log(stderr);
  } catch (error) {
    console.log(error);
  }
};

(async () => {
  await getLatestVersions();
})();
