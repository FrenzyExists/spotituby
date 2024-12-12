#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed with code ${code}`));
    });
  });
}

async function setup() {
  console.log('🎵 Setting up Spotituby...');

  try {
    // Check Python version
    await runCommand('python3', ['--version']);
    
    // Create virtual environment if it doesn't exist
    const venvPath = resolve(rootDir, '.venv');
    if (!fs.existsSync(venvPath)) {
      console.log('📦 Creating Python virtual environment...');
      await runCommand('python3', ['-m', 'venv', '.venv']);
    }

    // Activate virtual environment and install dependencies
    const activateScript = process.platform === 'win32' 
      ? '.venv\\Scripts\\activate'
      : 'source .venv/bin/activate';

    console.log('📥 Installing Python dependencies...');
    await runCommand(`${activateScript} && pip install -r requirements.txt`, [], {
      cwd: rootDir
    });

    // Check if yt-dlp is installed globally
    try {
      await runCommand('yt-dlp', ['--version']);
    } catch (error) {
      console.log('⚠️  yt-dlp not found, installing...');
      if (process.platform === 'win32') {
        await runCommand('pip', ['install', 'yt-dlp']);
      } else {
        await runCommand('pip3', ['install', 'yt-dlp']);
      }
    }

    console.log('✅ Setup completed successfully!');
    console.log('🎵 You can now use the "spotituby" command from anywhere.');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setup(); 