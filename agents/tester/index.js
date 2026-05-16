// Tester Agent
// Input:  issue context + generated source files
// Output: array of { filePath, content } for test files

'use strict';

const { readPrompt, createCompletion } = require('../openai-client');

// Cap the total source code sent to OpenAI to avoid hitting the context limit.
const MAX_SOURCE_CHARS = 40_000;

/**
 * @param {string} issueTitle
 * @param {string} issueBody
 * @param {Array<{ filePath: string, content: string }>} generatedFiles
 * @returns {Promise<Array<{ filePath: string, content: string }>>}
 */
async function run(issueTitle, issueBody, generatedFiles) {
  const systemPrompt = readPrompt('tester');

  // Only include non-SCSS files (no point testing styles)
  const testableFiles = generatedFiles.filter(f => !f.filePath.endsWith('.scss'));

  // Build a condensed view of the source files with a character budget
  let budget = MAX_SOURCE_CHARS;
  const fileBlocks = [];
  for (const { filePath, content } of testableFiles) {
    const block = `### ${filePath}\n\`\`\`typescript\n${content}\n\`\`\``;
    if (budget <= 0) {
      fileBlocks.push(`### ${filePath}\n_(truncated — context limit reached)_`);
    } else {
      fileBlocks.push(block);
      budget -= block.length;
    }
  }

  const userContent = [
    '## Feature',
    issueTitle,
    '',
    '## Description',
    issueBody || '(no description provided)',
    '',
    '## Source Files to Test',
    fileBlocks.join('\n\n'),
  ].join('\n');

  console.log('Tester: calling OpenAI…');
  const raw = await createCompletion(systemPrompt, userContent, {
    model: 'gpt-4o',
    jsonMode: true,
    maxTokens: 8192,
  });

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Tester: OpenAI returned non-JSON output.\n${raw}`);
  }

  if (!Array.isArray(parsed.files)) {
    throw new Error(`Tester: 'files' key missing or not an array.\n${raw}`);
  }

  console.log(`Tester: received ${parsed.files.length} test file(s) from OpenAI.`);
  return parsed.files;
}

module.exports = { run };
