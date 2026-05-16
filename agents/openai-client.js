// Shared AI client — supports multiple providers via AI_PROVIDER env var.
//
// Supported providers:
//   gemini  (default) — free tier at aistudio.google.com
//   openai            — platform.openai.com (paid)
//   ollama            — local models, fully free
//
// Set in your workflow or .env:
//   AI_PROVIDER=gemini   AI_API_KEY=AIza...
//   AI_PROVIDER=openai   AI_API_KEY=sk-...
//   AI_PROVIDER=ollama   OLLAMA_MODEL=llama3.2   (no key needed)

'use strict';

const fs = require('fs');
const path = require('path');

const PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

/**
 * Read a system-prompt file from the top-level prompts/ directory.
 * @param {string} agentName  e.g. 'architect'
 */
function readPrompt(agentName) {
  const promptPath = path.join(process.cwd(), 'prompts', `${agentName}.md`);
  return fs.readFileSync(promptPath, 'utf8');
}

/**
 * Call the configured AI provider.
 * @param {string} systemPrompt
 * @param {string} userContent
 * @param {{ model?: string, jsonMode?: boolean, maxTokens?: number }} [options]
 * @returns {Promise<string>}
 */
async function createCompletion(systemPrompt, userContent, options = {}) {
  switch (PROVIDER) {
    case 'openai':  return _openai(systemPrompt, userContent, options);
    case 'ollama':  return _ollama(systemPrompt, userContent, options);
    case 'gemini':
    default:        return _gemini(systemPrompt, userContent, options);
  }
}

// ─── Google Gemini ────────────────────────────────────────────────────────────
// Free tier: 1,500 req/day (Gemini 1.5 Flash)
// Key:       aistudio.google.com → Get API key
// Env var:   AI_API_KEY=AIza...

async function _gemini(systemPrompt, userContent, options = {}) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const { jsonMode = false, model = 'gemini-1.5-flash' } = options;

  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('AI_API_KEY is not set (needed for Gemini)');

  const genAI = new GoogleGenerativeAI(apiKey);
  const instance = genAI.getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
    generationConfig: jsonMode
      ? { responseMimeType: 'application/json' }
      : { responseMimeType: 'text/plain' }
  });

  const result = await instance.generateContent(userContent);
  return result.response.text();
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────
// Paid.  Key: platform.openai.com → API keys
// Env var: AI_API_KEY=sk-...

async function _openai(systemPrompt, userContent, options = {}) {
  const OpenAI = require('openai');
  const { model = 'gpt-4o', jsonMode = false, maxTokens = 4096 } = options;

  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('AI_API_KEY is not set (needed for OpenAI)');

  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    response_format: jsonMode ? { type: 'json_object' } : { type: 'text' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userContent  }
    ]
  });
  return response.choices[0].message.content;
}

// ─── Ollama (local) ───────────────────────────────────────────────────────────
// Fully free — runs on your own machine / self-hosted runner.
// Install:   ollama.com  →  ollama pull llama3.2
// Env vars:  OLLAMA_MODEL=llama3.2   OLLAMA_HOST=http://localhost:11434

async function _ollama(systemPrompt, userContent, options = {}) {
  const model = process.env.OLLAMA_MODEL || options.model || 'llama3.2';
  const host  = process.env.OLLAMA_HOST  || 'http://localhost:11434';
  const { jsonMode = false } = options;

  const body = {
    model,
    stream: false,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userContent  }
    ],
    ...(jsonMode ? { format: 'json' } : {})
  };

  const response = await fetch(`${host}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.message.content;
}

module.exports = { readPrompt, createCompletion };
