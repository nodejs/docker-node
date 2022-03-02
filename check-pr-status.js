// fetch /repos/{owner}/{repo}/pulls/{pull_number}
// and check if the status checks of a pull request are all green
// if so, exit with status code 0
// else exit with error
(async () => {
  const [owner, repo, pull_number] = process.argv.slice(2);

  const response = await (await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pull_number}`)).json();

  console.log(response);

  // const { data: pullRequest } = await octokit.pulls.get({
  //   owner,
  //   repo,
  //   pull_number,
  // });
  // const { data: statusChecks } = await octokit.checks.listForRef({
  //   owner,
  //   repo,
  //   ref: pullRequest.head.sha,
  // });
  // const statusChecksPassed = statusChecks.check_runs.every(
  //   (check) => check.conclusion === "success"
  // );
  // if (statusChecksPassed) {
  //   process.exit(0);
  // } else {
  //   process.exit(1);
  // }
})();
