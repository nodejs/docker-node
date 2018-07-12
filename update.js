#!/usr/bin/env node

const request = require('request');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const yaml = require('js-yaml');
const rimraf = require('rimraf');

let globalConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')));

const nodeKeys = fs.readFileSync(path.join('keys', 'node.keys')).toString().split('\n').join(' \\\n    ').trim();
const yarnKeys = fs.readFileSync(path.join('keys', 'yarn.keys')).toString().split('\n').join(' \\\n    ').trim();

// Grab the latest version of Yarn in case it needs to be bumped
request('https://yarnpkg.com/latest-version', function (error, response, body) {
  if (!error && response.statusCode == 200) {
    let yarn = response.body.toString()

    globalConfig.yarn = yarn;

    fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify(globalConfig, null, '  ') + '\n')

    getNodeJsReleaseSchedule();
  }
});

// Check the NodeJS schedule data to find what releases have valid start/end dates
function getNodeJsReleaseSchedule() {
  request('https://raw.githubusercontent.com/nodejs/Release/master/schedule.json', function (error, response, body) {
    let supportedNodeJSVersions = [];
    if (!error && response.statusCode == 200) {
      let schedule = JSON.parse(body);
      const now = Date.now();
      for (var version in schedule) {
        if (schedule.hasOwnProperty(version)) {
          let details = schedule[version];
          let start = new Date(details.start);
          let end = new Date(details.end);
          if (now >= start && now <= end) {
            supportedNodeJSVersions.push(version);
          } else {
            removeDockerFile(version);
          }
        }
      }
      getNodeJsIndexJson(supportedNodeJSVersions);
    }
  });
}

// Get the full release information from the NodeJS index.json
function getNodeJsIndexJson(supportedNodeJSVersions) {
  let supportedChakracoreVersions = Array.from(supportedNodeJSVersions);
  request('https://nodejs.org/dist/index.json', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      let nodejsReleases = JSON.parse(body);
      for (var record in nodejsReleases) {
        if (nodejsReleases.hasOwnProperty(record)) {
          let nodejs = nodejsReleases[record];
          let version = nodejs.version;
          let major = version.split('.')[0];
          if (supportedNodeJSVersions.indexOf(major) != -1) {
            // First hit should be the latests, so pop it off
            // and look for the next latest major release
            supportedNodeJSVersions.pop();

            if (fs.existsSync(path.join(__dirname, major.replace('v', '')))) {
              updateDockerFile(nodejs);
            } else {
              createNewMajorVersion(nodejs)
            }
          }
        }
      }
      getChakraCoreIndexJson(supportedChakracoreVersions);
    }
  });
}

// Get the full release information from the Chakracore index.json
function getChakraCoreIndexJson(supportedChakracoreVersions) {
  request('https://nodejs.org/download/chakracore-release/index.json', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      let chakracoreReleases = JSON.parse(body);
      for (var record in chakracoreReleases) {
        if (chakracoreReleases.hasOwnProperty(record)) {
          let chakra = chakracoreReleases[record];
          let version = chakra.version;
          let major = version.split('.')[0];
          if (supportedChakracoreVersions.indexOf(major) != -1) {
            // First hit should be the latests, so pop it off
            // and look for the next latest major release
            supportedChakracoreVersions.pop();

            if (fs.existsSync(path.join(__dirname, 'chakracore', major.replace('v', '')))) {
              updateDockerFile(chakra, 'chakracore');
            } else {
              createNewMajorVersion(chakra, 'chakracore')
            }
          }
        }
      }
      // Update the travis.yml with the now updated Dockerfile details
      updateTravisYml();
    }
  });
}

function updateDockerFile(nodejs, root = '') {
  let nodeNext = nodejs.version.replace('v', '');
  let nodeMajor = nodeNext.split('.')[0];
  let nodeNextMinor = nodeNext.split('.')[1];
  let config = JSON.parse(fs.readFileSync(path.join(root, nodeMajor, 'config.json')));

  // // Check for current version
  let nodePrevious = config.nodejs;
  let nodePreviousMinor = nodePrevious.split('.')[1];

  if (nodePrevious === nodeNext) {
    // No updates need
    return;
  } else if (nodePreviousMinor !== nodeNextMinor) {
    // Minor patch will bump Yarn
    config.yarn = globalConfig.yarn;
    if (config.alpine) {
      config.alpine = globalConfig.alpine;
    }
  }

  // Update version file
  config.nodejs = nodeNext
  fs.writeFileSync(path.join(root, nodeMajor, 'config.json'), JSON.stringify(config, null, '  ') + '\n')

  // Find and update templates
  let pattern = `${nodeMajor}/**/Dockerfile`
  if (root) {
    pattern = root + '/' + pattern;
  }
  glob(pattern, function (err, files) {
    if (err) {
      return console.log(err);
    }
    files.forEach(file => {
      let variant = file.replace(root, '').replace(nodeMajor, '').replace('Dockerfile', '').replace(/\//g, '');
      let template = '';
      if (root) {
        template = fs.readFileSync(path.join(root, 'Dockerfile.template')).toString();
      } else {
        template = fs.readFileSync(`Dockerfile-${variant}.template`).toString();
      }
      template = updateVariant(template, config);
      fs.writeFileSync(file, template);
    });
  });
}

function updateVariant(template, config) {
  return template.replace('ENV NODE_VERSION 0.0.0', `ENV NODE_VERSION ${config.nodejs}`)
    .replace('ENV YARN_VERSION 0.0.0', `ENV YARN_VERSION ${config.yarn}`)
    .replace('FROM alpine:0.0', `FROM alpine:${config.alpine}`)
    .replace('FROM node:0.0.0-jessie', `FROM node:${config.nodejs}-jessie`)
    .replace('"${NODE_KEYS[@]}"\n', `${nodeKeys}\n`)
    .replace('"${YARN_KEYS[@]}"', `${yarnKeys}`)
}

function createNewMajorVersion(nodejs, root = '') {
  let nodeNext = nodejs.version.replace('v', '');
  let nodeMajor = nodeNext.split('.')[0];

  let config = globalConfig;
  config.nodejs = nodeNext;

  fs.mkdirSync(path.join(__dirname, root, nodeMajor));
  fs.writeFileSync(path.join(root, nodeMajor, 'config.json'), JSON.stringify(config, null, '  ') + '\n')

  let pattern = `Dockerfile*.template`
  if (root) {
    pattern = root + '/' + pattern;
  }
  glob(pattern, {
    ignore: "*onbuild*"
  }, function (err, files) {
    files.forEach(file => {
      let variant = path.basename(file, '.template').replace('Dockerfile', '').replace('-', '');
      let variantFolder = path.join(root, nodeMajor, variant);
      let template = fs.readFileSync(file).toString();
      if (!fs.existsSync(variantFolder)) {
        fs.mkdirSync(variantFolder);
      }
      template = updateVariant(template, config);
      fs.writeFileSync(path.join(variantFolder, "Dockerfile"), template)
    });
  });
}

function removeDockerFile(nodejs) {
  let version = nodejs.replace('v', '');
  rimraf.sync(`${version}/`);
  rimraf.sync(`chakracore/${version}/`);
}

function updateTravisYml() {
  try {
    let travis = yaml.safeLoad(fs.readFileSync('.travis.yml', 'utf8'));

    // Filter out the existing Docker jobs so we can overwrite them
    travis.jobs.include = travis.jobs.include.filter(record => {
      return record.stage !== 'Build'
    });

    glob(`**/Dockerfile`, {
      ignore: 'node_modules/**'
    }, function (err, files) {
      if (err) {
        return console.log(err);
      }
      files.forEach(file => {
        let job = {
          stage: 'Build',
          env: []
        }
        let nodeVersion = file.split('/')[0];
        let variant = file.replace(/\d*/g, '').replace('Dockerfile', '').replace(/\//g, '');
        if (variant === 'chakracore') {
          variant = 'default'
          nodeVersion = file.replace('/Dockerfile', '');
        }
        job.env.push({
          NODE_VERSION: nodeVersion
        })
        job.env.push({
          VARIANT: variant
        })
        travis.jobs.include.push(job);
      })
      fs.writeFileSync('.travis.yml', yaml.safeDump(travis))
    })
  } catch (e) {
    console.log(e);
  }
}
