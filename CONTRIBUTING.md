# Version Updates

New **Node.js** releases are released as soon as possible.

New **NPM** releases are not tracked. We simply use the NPM version bundled in the corresponding Node.js release.

**Yarn** is updated to the latest version only when there is a new Node.js SemVer-minor release, and it's updated only in the branch with the new release, preferably in the same PR. The `update.sh` script does this automatically when invoked with a specific branch, e.g. `./update.sh 6.10`.
