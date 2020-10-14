#!/usr/bin/env node
'use strict';
const update = require('./updateLib');

const usage = `
  Update the node docker images.

  Usage:
    ./update.js [ OPTIONS ]

  OPTIONS:
    -h, --help\tthis message
    -a, --all\tupdate all images even if no node version update`;

const printUsage = () => {
  console.log(usage);
};

const runUpdate = async (updateAll) => {
  const updated = await update(updateAll);

  updated.forEach(({ file }) => {
    console.log('Updated', file);
  });

  if (!updated.length) {
    console.log('Nothing updated');
  }
};

const main = async () => {
  if (process.argv.length > 3) {
    printUsage();
    process.exit(1);
  }

  if (process.argv.length === 2) {
    await runUpdate(false);
    return;
  }

  switch (process.argv[2]) {
    case '-a':
    case '--all':
      await runUpdate(true);
      return;

    case '-h':
    case '--help':
      printUsage();
      return;

    default:
      printUsage();
      process.exit(1);
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
