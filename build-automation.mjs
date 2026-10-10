import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { env } from 'node:process';
import { exportVariable } from '@actions/core';

import shell from 'shelljs';

const updatedVersions = [];

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

  for (let supportedVersion of supportedVersions) {
    console.log(`Checking for updates for ${supportedVersion}`);
    const folders = readdirSync(join('.', supportedVersion));
    let latestVersion = officialIndexJson.find((indexVersion) =>
      indexVersion.version.startsWith(`v${supportedVersion}`),
    );

    const lastFolder = folders.at(-1);
    const dockerFile = readFileSync(
      join('.', supportedVersion, lastFolder, 'Dockerfile'),
      'utf-8',
    );

    const localVersion =
      'v' +
      dockerFile.match(/NODE_VERSION=(?<version>\d*\.\d*\.\d)/).groups[
        'version'
      ];
    console.log(`\tRead version ${localVersion} from ${lastFolder}`);

    if (latestVersion.version !== localVersion) {
      console.warn(
        `\tFound new version ${latestVersion.version}, released on ${latestVersion.date}!`,
      );
      let updateStatement = `bash update.sh ${supportedVersion}`;
      console.log(`\tRunning '${updateStatement}'.`);
      shell.exec(updateStatement);
      updatedVersions.push(latestVersion.version);
    } else {
      console.log(`\tEverything up to date for ${latestVersion.version}!
\tReleased: ${latestVersion.date}
\tSecurity release: ${latestVersion.security}`);
    }
  }

  if (updatedVersions.length !== 0) {
    env.NODE_PR_TITLE = `feat: Node.js ${updatedVersions.join(', ')}`;
    // Let the GitHub Action library set the GITHUB_ENV file rather than manually handling it
    exportVariable('NODE_PR_TITLE', env.NODE_PR_TITLE);
  }
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  if (env.NODE_PR_TITLE) {
    console.log(`PR will be created with title '${env.NODE_PR_TITLE}'`);
  } else {
    console.log('No Pull Request will be created.');
  }
}
