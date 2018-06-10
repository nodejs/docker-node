const fs = require('fs');
const path = require('path');
const proc = require('child_process');
const latestVersions = require('./latest_node_versions.json');


for (version in latestVersions) {
  const dockerDir = path.join(__dirname, version);
  fs.readdir(dockerDir, function(version, err, files) {
    files.forEach((file, index) => {
      const dockerFile = path.join(__dirname, version, file,'Dockerfile');
      if (fs.existsSync(dockerFile)) {
        const command = `sed -i.bak 's|ENV NODE_VERSION.*|ENV NODE_VERSION ${latestVersions[version]}|' ${dockerFile}`;
        const command2 = `rm ${dockerFile}.bak`;
        proc.execSync(command); 
        proc.execSync(command2); 
      }
    });
  }.bind(null,version)); 
}
