// fetch /repos/{owner}/{repo}/pulls/{pull_number}
// and check its mergeable_state
// if "clean", exit with status code 0
// else exit with error
const { setTimeout } = require('timers/promises');

(async () => {
  const retries = 10;
  const retryDelay = 10000;

  for (let tries = 0; tries < retries; tries++) {
    try {
      const [owner, repo, pull_number] = process.argv.slice(2);

      const data = await (await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pull_number}`)).json();

      if (data.mergeable_state === 'clean') {
        process.exit(0);
      }
      setTimeout(retryDelay);
    } catch (error) {
      process.exit(1);
    }
  }
  process.exit(1);
})();
