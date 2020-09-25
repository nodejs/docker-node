const testFiles = [
  'functions.sh',
  'test-build.sh',
  'test-image.bats',
];

const areTestFilesChanged = (changedFiles) => changedFiles.filter(
  (file) => testFiles.includes(value),
);

const getAllDockerfiles = () => {

};

// Get the Dockerfiles affected by changing architectures files
const getArchDockerfiles = (archFiles) => {

};

const buildMatrix = (filesAdded, filesModified, filesRenamed) => {
  const files = [
    ...filesAdded,
    ...filesModified,
    ...filesRenamed,
  ];

  // If the test files were changed, include everything
  if (areTestFilesChanged(files)) {
    console.log('Test files changed so scheduling all Dockerfiles');
  }

  const dockerfiles = files.filter((file) => file.endsWith('/Dockerfile'));


  // Look for changed `architectures` files.
  const archFiles = files.filter((file) => file.endsWith('/architectures'));
};
