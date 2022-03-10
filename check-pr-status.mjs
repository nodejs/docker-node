// fetch /repos/{owner}/{repo}/pulls/{pull_number}
// and check its mergeable_state
// if "clean", exit with status code 0
// else exit with error
import { setTimeout } from 'timers/promises';

const tries = 10;
const retryDelay = 30000;

export default async function(github, repository, pull_number) {
  const [owner, repo] = repository.split('/');
  await setTimeout(retryDelay);

  for (let t = 0; t < tries; t++) {
    try {
      const { data } = await github.rest.pulls.get({owner, repo, pull_number})

      console.log(data);
      if (data.mergeable_state === 'clean') {
        process.exit(0);
      }
      await setTimeout(retryDelay);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
  process.exit(1);
}
