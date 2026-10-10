import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { exportVariable } from '@actions/core';

import shell from 'shelljs';

const updatedVersions = [];
let prTitle = '';

try {
  const supportedVersions = JSON.parse(readFileSync('versions.json'));

  console.log(
    `Found major versions in versions.json: ${Object.keys(supportedVersions).join(', ')}`,
  );

  console.log('Grabbing Index.json files');
  const availableVersions = await fetch(
    'https://nodejs.org/download/release/index.json',
  );
  const officialIndexJson = await availableVersions.json();

  for (let supportedVersion in supportedVersions) {
    console.log(`Checking for updates for ${supportedVersion}`);
    let latestVersion = officialIndexJson.find((indexVersion) =>
      indexVersion.version.startsWith(`v${supportedVersion}`),
    );

    const variant = Object.keys(
      supportedVersions[supportedVersion].variants,
    )[0];
    const dockerFile = readFileSync(
      join('.', supportedVersion, variant, 'Dockerfile'),
      'utf-8',
    );

    const localVersion =
      'v' +
      dockerFile.match(/NODE_VERSION=(?<version>\d*\.\d*\.\d)/).groups[
        'version'
      ];
    console.log(`\tRead version ${localVersion} from ${variant}`);

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
    prTitle = `feat: Node.js ${updatedVersions.join(', ')}`;
    // Let the GitHub Action library set the GITHUB_ENV file rather than manually handling it
    exportVariable('NODE_PR_TITLE', prTitle);
  }
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  if (prTitle) {
    console.log(`PR will be created with title '${prTitle}'`);
  } else {
    console.log('No Pull Request will be created.');
  }
}
