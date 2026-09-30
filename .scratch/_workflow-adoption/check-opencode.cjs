#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const candidates = ['AGENTS.md', 'CONTEXT.md', 'workflow.md', 'opencode.jsonc'];
const missing = candidates.filter((name) => !fs.existsSync(path.join(root, name)));

if (missing.length > 0) {
  console.error(`Missing workflow inputs: ${missing.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('Workflow input files are present.');
}
