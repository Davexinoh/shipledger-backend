const { Octokit } = require('@octokit/rest');

// // GET_GITHUB_ACTIVITY
async function getGithubActivity(username, token) {
  const octokit = new Octokit({ auth: token });

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceISO = since.toISOString();

  // // GET_REPOS
  // listForAuthenticatedUser returns BOTH public and private repos for the authed user.
  // listForUser (the old call) only returns public repos — missed private work entirely.
  const { data: repos } = await octokit.repos.listForAuthenticatedUser({
    sort: 'pushed',
    per_page: 30,       // bumped from 10 — active builders have many repos
    visibility: 'all',  // public + private
  });

  // Filter to repos the user owns or is a member of
  const userRepos = repos.filter(
    (r) => r.owner.login.toLowerCase() === username.toLowerCase()
  );

  let totalCommits = 0;
  let totalPRs = 0;
  const activeRepos = [];

  for (const repo of userRepos) {
    // // COUNT_COMMITS
    try {
      const { data: commits } = await octokit.repos.listCommits({
        owner: repo.owner.login,
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
      // repo may be empty, archived, or inaccessible — skip
    }

    // // COUNT_MERGED_PRS
    try {
      const { data: prs } = await octokit.pulls.list({
        owner: repo.owner.login,
        repo: repo.name,
        state: 'closed',
        sort: 'updated',
        direction: 'desc',
        per_page: 20,
      });

      const recentMerged = prs.filter(
        (pr) =>
          pr.merged_at &&
          new Date(pr.merged_at) >= since &&
          pr.user?.login?.toLowerCase() === username.toLowerCase()
      );
      totalPRs += recentMerged.length;
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
