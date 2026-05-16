// PR Review Agent — entry point.
// Called by: .github/workflows/ai-agents.yml (on pull_request opened/synchronize)
//
// Fetches the PR diff, sends it to OpenAI with the reviewer system prompt,
// then posts the result as a PR review comment.

'use strict';

const fs = require('fs');
const { readPrompt, createCompletion } = require('../../scripts/openai-client');
const { getPRDiff, addPRReview } = require('../../scripts/github');

// Diff can be very large; cap it to stay within the model's context window.
const MAX_DIFF_CHARS = 30_000;

async function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) throw new Error('GITHUB_EVENT_PATH is not set');
  const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));

  const pr = event.pull_request;
  if (!pr) throw new Error('Event does not contain a pull_request');

  const prNumber = pr.number;
  const prTitle  = pr.title;
  console.log(`\n🔍 Reviewing PR #${prNumber}: ${prTitle}\n`);

  const rawDiff = await getPRDiff(prNumber);
  const diff = typeof rawDiff === 'string'
    ? rawDiff.slice(0, MAX_DIFF_CHARS)
    : JSON.stringify(rawDiff).slice(0, MAX_DIFF_CHARS);

  const systemPrompt = readPrompt('reviewer');
  const userContent = [
    `## PR Title\n${prTitle}`,
    '',
    '## Unified Diff',
    '```diff',
    diff,
    '```',
  ].join('\n');

  console.log('Reviewer: calling OpenAI…');
  const review = await createCompletion(systemPrompt, userContent, {
    model: 'gpt-4o',
    maxTokens: 4096,
  });

  await addPRReview(prNumber, review, 'COMMENT');
  console.log(`✅ Review posted to PR #${prNumber}`);
}

main().catch(err => {
  console.error('\n❌ Reviewer failed:', err);
  process.exit(1);
});
