// Shared GitHub API helpers used by all agents.
// All methods read owner/repo from the GITHUB_REPOSITORY env var
// that GitHub Actions injects automatically.

'use strict';

const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

function parseRepo() {
  const repo = process.env.GITHUB_REPOSITORY || '';
  const [owner, name] = repo.split('/');
  if (!owner || !name) throw new Error('GITHUB_REPOSITORY env var not set or malformed');
  return { owner, repo: name };
}

/** Post a comment on an issue. */
async function postIssueComment(issueNumber, body) {
  const { owner, repo } = parseRepo();
  await octokit.issues.createComment({ owner, repo, issue_number: issueNumber, body });
}

/**
 * Create a pull request.
 * @param {{ head: string, base?: string, title: string, body: string }} opts
 */
async function createPullRequest({ head, base = 'main', title, body }) {
  const { owner, repo } = parseRepo();
  const { data } = await octokit.pulls.create({
    owner, repo, head, base, title, body, draft: false
  });
  return data;
}

/**
 * Fetch the unified diff of an open PR.
 * Returns a plain string (the diff text).
 */
async function getPRDiff(pullNumber) {
  const { owner, repo } = parseRepo();
  const response = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
    owner,
    repo,
    pull_number: pullNumber,
    headers: { accept: 'application/vnd.github.diff' }
  });
  return response.data;
}

/**
 * Post a review comment on a PR.
 * @param {number} pullNumber
 * @param {string} body  Markdown review body
 * @param {'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES'} [event]
 */
async function addPRReview(pullNumber, body, event = 'COMMENT') {
  const { owner, repo } = parseRepo();
  await octokit.pulls.createReview({ owner, repo, pull_number: pullNumber, body, event });
}

/** Add labels to an issue. */
async function addIssueLabels(issueNumber, labels) {
  const { owner, repo } = parseRepo();
  await octokit.issues.addLabels({ owner, repo, issue_number: issueNumber, labels });
}

module.exports = { postIssueComment, createPullRequest, getPRDiff, addPRReview, addIssueLabels };
