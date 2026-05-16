// Architect Agent
// Input:  issue title + body
// Output: { architectureMd, tasksMd } written to docs/

'use strict';

const { readPrompt, createCompletion } = require('../openai-client');

/**
 * @param {string} issueTitle
 * @param {string} issueBody
 * @returns {Promise<{ architectureMd: string, tasksMd: string }>}
 */
async function run(issueTitle, issueBody) {
  const systemPrompt = readPrompt('architect');

  const userContent = [
    '## Issue Title',
    issueTitle,
    '',
    '## Issue Description',
    issueBody || '(no description provided)',
  ].join('\n');

  console.log('Architect: calling OpenAI…');
  const raw = await createCompletion(systemPrompt, userContent, {
    model: 'gpt-4o',
    jsonMode: true,
    maxTokens: 8192,
  });

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Architect: OpenAI returned non-JSON output.\n${raw}`);
  }

  if (!parsed.architecture_md || !parsed.tasks_md) {
    throw new Error(`Architect: missing 'architecture_md' or 'tasks_md' in response.\n${raw}`);
  }

  return {
    architectureMd: parsed.architecture_md,
    tasksMd: parsed.tasks_md,
  };
}

module.exports = { run };
