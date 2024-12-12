#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mainScript = resolve(__dirname, '..', 'index.js');

// Forward all arguments to the main script
const args = process.argv.slice(2);
const child = spawn('node', [mainScript, ...args], {
  stdio: 'inherit',
  shell: true
});

child.on('error', (error) => {
  console.error('Failed to start process:', error);
  process.exit(1);
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});

process.on('SIGINT', () => {
  child.kill('SIGINT');
}); 