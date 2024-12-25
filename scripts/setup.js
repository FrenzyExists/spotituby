#!/usr/bin/env node

import { spawn, execSync, exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import { blue, red, yellow, cyan, green, clr } from '../src/utils/colors.js';
import {
  Command
} from "commander";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const MANPAGE_FILE = "spotituby.1";
const MANPAGE_DIR = process.platform === 'win32' ? `${process.env.HOME}/man/man1` : "/usr/local/share/man/man1";
const PYTHON_ENV = ".venv";
const PYTHON_PKGS = "requirements.txt";
const APP_NAME = "Spotituby";


const runCommand = (command, args, options = {}) => {
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


const getVersion = (command, show_version = true) => {
  try {
    const v = show_version ? "--version" : "";
    const version = execSync(`${command} ${v}`, {
      shell: false,
      stdio: ['ignore', 'pipe', 'ignore'], // Suppress stderr
    }).toString().trim();
    const versionMatch = version.match(/(\d+\.\d+(\.\d+)?)/);
    return versionMatch ? versionMatch[0] : null; // Return the version number or null
  } catch {
    return null;
  }
};

const installPython = async () => {
  // Create virtual environment if it doesn't exist
  const venvPath = resolve(rootDir, PYTHON_ENV);

  console.log('\n🔍 Looking for local venv and python dependencies...');
  if (!fs.existsSync(venvPath)) {
    console.log('📦 Creating Python virtual environment...');
    await runCommand('python3', ['-m', 'venv', PYTHON_ENV]);
  } else {
    // New line to indicate venv was found
    console.log('✅ venv found! 🎉');

    // Activate virtual environment and install dependencies
    const activateScript = process.platform === 'win32'
      ? '.venv\\Scripts\\activate'
      : 'source .venv/bin/activate';

    // Check if yt-dlp is installed
    const ytDlpVersion = getVersion('yt-dlp');

    if (!ytDlpVersion) {
      console.log('📥 Installing yt-dlp...');
      await runCommand(`${activateScript} && pip install -r ${PYTHON_PKGS}`, [], {
        cwd: rootDir
      });
    } else {
      console.log('✅ yt-dlp is already installed! 🎉');
    }
  }
}

const checkDependencies = async () => {
  console.log("🔍 Checking dependencies...\n");
  const missingDeps = [];

  // Common dependencies
  const pythonVersion = getVersion('python3');
  const npmVersion = getVersion('npm');
  const gitVersion = getVersion('git');

  console.log(`${pythonVersion ? '✅' : '❎'} Python ${pythonVersion || (missingDeps.push("🐍 Python"), 'not found')}`);
  console.log(`${npmVersion ? '✅' : '❎'} NPM ${npmVersion || (missingDeps.push("🛠️ NPM"), 'not found')}`);
  console.log(`${gitVersion ? '✅' : '❎'} Git ${gitVersion || (missingDeps.push("🧑‍💻 Git"), 'not found')}`);

  // OS-specific dependency checks
  if (process.platform === 'darwin') {
    const brewVersion = getVersion('brew --version')
    console.log(`${brewVersion ? '✅' : '❎'} brew ${brewVersion || (missingDeps.push("🍺 Homebrew"), 'not found')}`);
  }
  return missingDeps;
}

const installManpage = async () => {
  if (fs.existsSync(MANPAGE_FILE)) {
    console.log("\n📦 Installing manpage...");
    fs.mkdirSync(MANPAGE_DIR, { recursive: true });
    fs.copyFileSync(MANPAGE_FILE, `${MANPAGE_DIR}/${MANPAGE_FILE}`);
    console.log("✅ Manpage installed successfully");
  } else {
    console.warn(`❎ Manpage file not found: ${MANPAGE_FILE}`);
  }
}

const installNpm = async () => {
  console.log("\n📦 Installing NPM packages...");

  return new Promise((resolve, reject) => {
    exec('NODE_NO_WARNINGS=1 npm install -g --silent', { stdio: 'inherit' }, (error, stdout, stderr) => {
      if (error) {
        return reject(`Error: ${stderr}`);
      }
      console.log("✅ Packages installed!");
      resolve();
    });
  });
}

/**
 * Installs the application.
 */
const installApp = async () => {
  console.clear();
  console.log(`🎵 Installing ${green}${APP_NAME}${clr}...`);
  try {
    const dependencies = await checkDependencies();
    if (dependencies.length > 0) {
      console.log(`Missing dependencies:`);
      dependencies.forEach(i => {
        console.log(i);
      });
    }

    await installPython();
    await installNpm();
    await installManpage();

    console.log(`\n\n\n${blue}-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-${clr}\n✅ Setup completed successfully!`);
    console.log(`🎵 You can now use the ${green}"${APP_NAME}"${clr} command from anywhere.`);
  } catch (e) {
    console.error('❎ Setup failed:', e.message);
    process.exit(1);
  }
  console.log(`${blue}-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-${clr}`);
}

const uninstallApp = async () => {
  console.log(`Uninstalling ${APP_NAME}...`);
  if (fs.existsSync(PYTHON_ENV)) {
    console.log("Removing Python virtual environment...");
    fs.rmdirSync(PYTHON_ENV, { recursive: true });
  }

  if (fs.existsSync('node_modules')) {
    console.log("Removing NPM packages...");
    fs.rmdirSync(node_modules, { recursive: true });
  }

  const manpagePath = `${MANPAGE_DIR}/${MANPAGE_FILE}`;
  if (fs.existsSync(manpagePath)) {
    console.log("Removing manpage...");
    fs.unlinkSync(manpagePath);
    console.log("Manpage removed successfully");
  }

}

const setup = async () => {
  const program = new Command()
  program
    .command('install')
    .description(`Install ${APP_NAME}`)
    .action(async o => {
      await installApp();
    })

  program
    .command('uninstall')
    .description(`Remove ${APP_NAME}`)
    .action(async o => {
      await uninstallApp();
    })

  program
    .name(`${APP_NAME} Wizard`)
    .description(`Lil 🎩 script 🪄 to manage ${APP_NAME}

${cyan}        ______
${cyan}       /ゝ    フ
${green}      |   _  _|  I'm a cat
${green}      /,ミ__Xノ   I sleep everywhere, anywhere, all at once
${yellow}    /       |     - Rufus, probably in his head idk
${yellow}   /  \\    ノ
${red} __│  | |  |
${red}/ _|   | |  |
${blue}|(_\\___\\_)__)
${blue} \\_つ${clr}\n
`)
  program.parse(process.argv);
}

setup();