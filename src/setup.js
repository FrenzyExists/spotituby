'use strict';

import axios from "axios";
import {
  Command
} from "commander";
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  __dirname
} from './utils.js'
import { HOME } from './utils.js'
import Colors from "./utils/colors.js";
import CLIMode from "./mode/cli.js";

const printHeader = () => {
  const packageJson = JSON.parse(
    readFileSync(resolve(__dirname, '../package.json'), 'utf8')
  );
  const VERSION = packageJson.version;

  const terminalWidth = process.stdout.columns || 80;

  const headerLines = [
    "==========================================================",
    "  Spotituby: Revolutionizing Music  ",
    `  v${VERSION}  `,
    "  Download your favorite music, anywhere, anytime  ",
    "  Made with ❤️ by FrenzyExists  ",
    "=========================================================="
  ];
  // Find the longest line to calculate padding
  const maxLength = Math.max(...headerLines.map(line => line.length));

  // Print each line centered
  const centeredHeader = headerLines
    .map(line => {
      const padding = Math.max(0, Math.floor((terminalWidth - line.length) / 2));
      return " ".repeat(padding) + `\x1b[34m${line}\x1b[0m`;
    })
    .join("\n");

  console.log("\n" + centeredHeader + "\n");
}

const checkInternet = () => {
  axios.request('https://google.com').catch(function (error) {
    if (!error.response) {
      // network error (server is down or no internet)
      throw(new Error("No Internet :("));
    } else {
      // http status code
      const code = error.response.status
      // data from server while error
      const response = error.response.data
    }
  });
}


/**
 * Main entry point of the application.
 *
 * Parses command-line arguments and either starts
 * a server or runs the CLI mode.
 *
 * @returns {void}
 */
const main = () => {
  checkInternet(); // Checks if you have any connection. Without internet you can't use this
  printHeader();   // Intro
  const program = new Command();

  // Add help text for examples
  program.addHelpText(
    "after",
  `
  Examples:
  ${Colors.blue}spotituby cli ${Colors.yellow}--url ${Colors.green}https://open.spotify.com/playlist/4nT7b2XU4sVWp8Rt7A6WqI${Colors.clr}
  ${Colors.blue}spotituby cli ${Colors.yellow}--reset${Colors.clr}    # Reset stored credentials
  ${Colors.blue}spotituby cli ${Colors.yellow}--download-path ${Colors.green}/path/to/downloads${Colors.clr}    # Specify download location
  ${Colors.blue}spotituby sync ${Colors.yellow}--watch-dir ${Colors.green}/path/to/watch${Colors.clr}
  `
  );

  // Define the command for CLI mode
  program
    .command('cli [url]')  // Made URL optional by changing '<url> ' to '[url]'
    .description('Run the app in CLI mode. Can optionally provide a URL (YouTube or Spotify) playlist or track')
    .option("--reset", "Reset stored credentials and start fresh", false)
    .option("--dir <music_dir>", "Directory to watch for music files", `${HOME}/Music`)
    .option("--download-path <path>", "Directory to save downloaded music files", `${HOME}/Downloads`)
    .action((url, options) => {
      // Handle CLI mode logic here
      const CLI = new CLIMode(url, options);
      return CLI.execute();
    });

    program
    .command('sync')
    .description('Run the app in Sync mode')
    .option("--watch-dir <dir>", "Directory to watch for music files", `${HOME}/Music`)
    .option("--reset", "Reset stored credentials and start fresh")
    .option("--interval <minutes>", "Sync interval in minutes", "30")
    .action((options) => {
      // Handle Sync mode logic here
      const watchDir = options.watchDir || `${HOME}/Downloads`;
      const interval = parseInt(options.interval) || 30;
      // startPlaylistSync(watchDir, interval);
      return;
    });

    program.parse(process.argv);
}

main();