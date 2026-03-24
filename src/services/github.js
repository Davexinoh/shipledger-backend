const { Octokit } = require('@octokit/rest');

// // GET_GITHUB_ACTIVITY
async function getGithubActivity(username, token) {
  const octokit = new Octokit({ auth: token });

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceISO = since.toISOString();

  // // GET_REPOS
  const { data: repos } = await octokit.repos.listForUser({
    username,
    sort: 'pushed',
    per_page: 10,
  });

  let totalCommits = 0;
  let totalPRs = 0;
  const activeRepos = [];

  for (const repo of repos) {
    // // COUNT_COMMITS
    try {
      const { data: commits } = await octokit.repos.listCommits({
        owner: username,
        repo: repo.name,
        author: username,
        since: sinceISO,
        per_page: 100,
      });

      if (commits.length > 0) {
        totalCommits += commits.length;
        activeRepos.push({
          name: repo.name,
          commits: commits.length,
          url: repo.html_url,
        });
      }
    } catch {
      // repo may be empty or inaccessible — skip
    }

    // // COUNT_PRS
    try {
      const { data: prs } = await octokit.pulls.list({
        owner: username,
        repo: repo.name,
        state: 'closed',
        sort: 'updated',
        direction: 'desc',
        per_page: 10,
      });

      const recentPRs = prs.filter(
        (pr) => pr.merged_at && new Date(pr.merged_at) >= since
      );
      totalPRs += recentPRs.length;
    } catch {
      // skip inaccessible repos
    }
  }

  return {
    username,
    period_start: sinceISO,
    period_end: new Date().toISOString(),
    total_commits: totalCommits,
    total_prs_merged: totalPRs,
    active_repos: activeRepos,
    velocity_score: Math.min(100, totalCommits * 2 + totalPRs * 5),
  };
}

module.exports = { getGithubActivity };