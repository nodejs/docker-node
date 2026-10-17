import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { exportVariable } from '@actions/core';

const supportedVersions = JSON.parse(readFileSync('versions.json'));

const nodeKeys = readFileSync(resolve(import.meta.dirname, 'keys', 'node.keys'))
  .toString()
  .trim()
  .split('\n');

const updatedVersions = [];

try {
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

    console.log(`\tLatest version: ${latestVersion.version}
\tReleased: ${latestVersion.date}
\tSecurity release: ${latestVersion.security}`);

    for (let variant in supportedVersions[supportedVersion].variants) {
      const dockerfilePath = join('.', supportedVersion, variant, 'Dockerfile');
      const currentDockerfile = readFileSync(dockerfilePath, 'utf-8');

      const localVersion =
        'v' +
        currentDockerfile.match(/NODE_VERSION=(?<version>\d*\.\d*\.\d)/).groups[
          'version'
        ];

      const arches = supportedVersions[supportedVersion].variants[variant];

      let baseImage;
      let archString = '';
      let dockerfileTemplate;
      if (variant.startsWith('alpine')) {
        dockerfileTemplate = readFileSync(
          resolve(import.meta.dirname, 'Dockerfile-alpine.template'),
        ).toString();

        baseImage = `alpine:${variant.replace(/alpine/, '')}`;
        if (arches.includes('amd64'))
          archString += `x86_64) ARCH='x64' OPENSSL_ARCH=linux-x86_64;; \\\n        `;
        if (arches.includes('arm64v8'))
          archString += `aarch64) OPENSSL_ARCH=linux-aarch64;; \\\n        `;
        if (arches.includes('arm32v6') || arches.includes('arm32v7'))
          archString += `arm*) OPENSSL_ARCH=linux-armv4;; \\\n        `;
        if (arches.includes('ppc64le'))
          archString += `ppc64le) OPENSSL_ARCH=linux-ppc64le;; \\\n        `;
        if (arches.includes('s390x'))
          archString += `s390x) OPENSSL_ARCH=linux-s390x;; \\\n        `;
        archString += '*) echo "unsupported architecture"; exit 1 ;; \\';
      } else if (variant.endsWith('-slim')) {
        dockerfileTemplate = readFileSync(
          resolve(import.meta.dirname, 'Dockerfile-slim.template'),
        ).toString();
        baseImage = `debian:${variant}`;
        if (arches.includes('amd64'))
          archString += `amd64) ARCH='x64' OPENSSL_ARCH='linux-x86_64';; \\\n      `;
        if (arches.includes('ppc64le'))
          archString += `ppc64el) ARCH='ppc64le' OPENSSL_ARCH='linux-ppc64le';; \\\n      `;
        if (arches.includes('s390x'))
          archString += `s390x) ARCH='s390x' OPENSSL_ARCH='linux*-s390x';; \\\n      `;
        if (arches.includes('arm64v8'))
          archString += `arm64) ARCH='arm64' OPENSSL_ARCH='linux-aarch64';; \\\n      `;
        if (arches.includes('arm32v7'))
          archString += `armhf) ARCH='armv7l' OPENSSL_ARCH='linux-armv4';; \\\n      `;
        archString += '*) echo "unsupported architecture"; exit 1 ;; \\';
      } else {
        dockerfileTemplate = readFileSync(
          resolve(import.meta.dirname, 'Dockerfile-debian.template'),
        ).toString();
        baseImage = `buildpack-deps:${variant}`;
        if (arches.includes('amd64'))
          archString += `amd64) ARCH='x64';; \\\n    `;
        if (arches.includes('ppc64le'))
          archString += `ppc64el) ARCH='ppc64le';; \\\n    `;
        if (arches.includes('s390x'))
          archString += `s390x) ARCH='s390x';; \\\n    `;
        if (arches.includes('arm64v8'))
          archString += `arm64) ARCH='arm64';; \\\n    `;
        if (arches.includes('arm32v7'))
          archString += `armhf) ARCH='armv7l';; \\\n    `;
        archString += '*) echo "unsupported architecture"; exit 1 ;; \\';
      }

      let dockerfileOutput = dockerfileTemplate
        .replace(/^FROM.+$/m, `FROM ${baseImage}`)
        .replace(
          /^ENV NODE_VERSION=.+$/m,
          `ENV NODE_VERSION=${latestVersion.version.substring(1)}`,
        )
        .replace(
          /^(\s*)"\${NODE_KEYS\[@]}".*$/m,
          ((keys) => keys.map((key) => `$1${key} \\`).join('\n'))(nodeKeys),
        )
        .replace(/"\$\{SUPPORTED_ARCH\[@\]\}"/s, archString);

      if (parseInt(supportedVersion, 10) >= 26) {
        dockerfileOutput = dockerfileOutput.replace(
          /ENV YARN_VERSION.*\*\n/s,
          '',
        );
      } else {
        // Strip out rust and cargo packages for Node.js < 26
        dockerfileOutput = dockerfileOutput.replace(
          /\s{4}rust \\.*cargo \\\s*/s,
          '',
        );
      }
      if (dockerfileOutput === currentDockerfile) {
        console.log(`\t${variant}: everything up to date!`);
      } else if (latestVersion.version !== localVersion) {
        console.log(`\t${variant}: updating to ${latestVersion.version}`);
        updatedVersions.push(latestVersion.version);
        writeFileSync(dockerfilePath, dockerfileOutput);
      } else {
        console.warn(
          `\t${variant}: non-version changes detected, but file not updated.`,
        );
      }
    }
  }
  if (updatedVersions.length !== 0) {
    // Let the GitHub Action library set the GITHUB_ENV file rather than manually handling it
    exportVariable(
      'NODE_PR_TITLE',
      `feat: Node.js ${[...new Set(updatedVersions)].join(', ')}`,
    );
  } else {
    console.log('No Pull Request will be created.');
  }
} catch (error) {
  console.error(error);
  process.exit(1);
}
