// Developer Agent
// Input:  issue context + architecture.md + tasks.md
// Output: array of { filePath, content } for source files

'use strict';

const { readPrompt, createCompletion } = require('../../scripts/openai-client');

/**
 * @param {string} issueTitle
 * @param {string} issueBody
 * @param {string} architectureMd
 * @param {string} tasksMd
 * @returns {Promise<Array<{ filePath: string, content: string }>>}
 */
async function run(issueTitle, issueBody, architectureMd, tasksMd) {
  const systemPrompt = readPrompt('developer');

  const userContent = [
    '## Issue Title',
    issueTitle,
    '',
    '## Issue Description',
    issueBody || '(no description provided)',
    '',
    '## Architecture',
    architectureMd,
    '',
    '## Task List',
    tasksMd,
  ].join('\n');

  console.log('Developer: calling OpenAI…');
  const raw = await createCompletion(systemPrompt, userContent, {
    model: 'gpt-4o',
    jsonMode: true,
    // Large token budget — SPFx files can be verbose
    maxTokens: 16384,
  });

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Developer: OpenAI returned non-JSON output.\n${raw}`);
  }

  if (!Array.isArray(parsed.files)) {
    throw new Error(`Developer: 'files' key missing or not an array.\n${raw}`);
  }

  for (const f of parsed.files) {
    if (!f.filePath || typeof f.content !== 'string') {
      throw new Error(`Developer: malformed file entry: ${JSON.stringify(f)}`);
    }
  }

  console.log(`Developer: received ${parsed.files.length} file(s) from OpenAI.`);
  return parsed.files;
}

module.exports = { run };
