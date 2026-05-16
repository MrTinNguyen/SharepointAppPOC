// Shared OpenAI client used by all agents.
// Each agent passes its prompt name; the system prompt is loaded from prompts/<name>.md.

'use strict';

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Read a system-prompt file from the top-level prompts/ directory.
 * @param {string} agentName  e.g. 'architect'
 */
function readPrompt(agentName) {
  const promptPath = path.join(process.cwd(), 'prompts', `${agentName}.md`);
  return fs.readFileSync(promptPath, 'utf8');
}

/**
 * Call the OpenAI Chat Completions API.
 * @param {string} systemPrompt
 * @param {string} userContent
 * @param {{ model?: string, jsonMode?: boolean, maxTokens?: number }} [options]
 * @returns {Promise<string>}
 */
async function createCompletion(systemPrompt, userContent, options = {}) {
  const { model = 'gpt-4o', jsonMode = false, maxTokens = 4096 } = options;

  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    response_format: jsonMode ? { type: 'json_object' } : { type: 'text' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ]
  });

  return response.choices[0].message.content;
}

module.exports = { readPrompt, createCompletion };
