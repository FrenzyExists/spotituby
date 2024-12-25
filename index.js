#!/usr/bin/env node

import {
  select,
} from "@inquirer/prompts";
import {
  identifyUrlType,
  fetchMe,
  fetchPlaylists,
  searchAndDownloadYTTrack,
  trackSelector,
  TOKENFILE,
  fetchLikedTracks,
  printHeader,
  getAuthToken,
  killPort,
  navigateSpotifyTracks
} from "./src/utils/index.js";
import {
  Command
} from "commander";
import {
  fileURLToPath
} from "url";
import {
  dirname,
  resolve
} from "path";
import {
  exec,
  fork,
  spawn
} from "child_process";
import os from "os";
import { startPlaylistSync } from "./src/utils/sync.js";
import { blue, bold, clr, cyan, green, italic, red, yellow } from "./src/utils/colors.js";



const __dirname = dirname(fileURLToPath(import.meta.url));

const HOME = os.homedir();

// Now you can use __dirname as before
const serverPath = resolve(__dirname, "src", "server.js");

const getYTPlaylist = async (url, outputDir) => {
  const getCommand = `yt-dlp --flat-playlist --dump-json "${url}"`;

  const c = new Promise((resolve, reject) => {
    const process = exec(getCommand);

    process.on("error", (error) => {
      console.error(`Error during execution: ${error.message}`);
      reject(error); // Reject the promise if an error occurs
    });

    let choices = [];
    process.stdout.on("data", (data) => {
      try {
        // Parse and accumulate JSON lines
        const parsedData = data
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line));
        choices.push(...parsedData); // Add parsed data to choices array
      } catch (error) {
        console.error(`Error parsing data: ${error.message}`);
        reject(error); // Reject the promise if parsing fails
      }
    });

    process.on("SIGTERM", () => {
      process.kill();
    });

    process.on("SIGINT", () => {
      process.kill();
    });

    process.on("close", (code) => {
      if (code === 0) {
        // Ensure choices is always an array and map to required format
        resolve(
          choices.map((v) => ({
            // might need to add more params 
            name: v.title, // Display name for selection
            value: v.url,  // Actual value to be used
          }))
        );
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });

  try {
    const playlist = await c;

    await trackSelector(playlist).then((selectedTracks) => {
      selectedTracks.map((t) => {
        searchAndDownloadYTTrack({
          url: t.url,
          search: false,
          outputDir: outputDir,
        });
      })
    });
  } catch (error) {
    console.error("Error during JSON extraction:", error);
  }
};


const downloadWithYtDlp = (url, outputDir, yt_type) => {
  if (yt_type === "yt-playlist") {
    getYTPlaylist(url, outputDir);
  } else if (yt_type === "yt-track") {
    searchAndDownloadYTTrack({ url, search: false, outputDir });
  }
};


const navigateSpotify = async (token) => {
  if (!token) {
    console.log("Error, no token found");
    return;
  }

  const user = await fetchMe(token);
  
  console.log(`🎉 Welcome ${cyan}${user.display_name}${clr}! 🎉`);

  const playlists = await fetchPlaylists(token);

  let choices = [];
  let n = 1
  playlists.map((pl) => {
    if (pl) { // getting null values for some reason
      choices.push({
        name: pl.name === "" ? `unnamed track #${n++}` : pl?.name,
        value: {
          id: pl?.id,
          name: pl?.name,
          tracks: pl?.tracks
        },
        description: pl?.description
      });
    }
  });
  console.clear()
  let selectPlaylist = await select({
    message: "Select a playlist",
    choices: choices
  }).catch(e => {
    console.log("Selection Cancelled. Goodbye 👋");
    process.exit(0);
  });
  return selectPlaylist;
};


/**
 * @deprecated This function is deprecated and should never be used.
 * It is intended to be removed in a future version.
 * 
 * Initiates a server in server mode.
 * 
 * @param {string} url - The URL to initiate the server with.
 * @returns {void}
 */
const serverMode = (url) => {
  console.log("Initiating server...");
  const server = spawn("node", [serverPath]);

  server.on("spawn", () => {
    console.log(
      "Server started\nlog in to your spotify account on http://localhost:3000/login"
    );
  });

  server.on("message", async (authorizationCode) => {
    // console.log(`Authorization code received: ${authorizationCode}`);
    console.log("Authorization code received");
    token = authorizationCode;
    console.log("Visit http://localhost:3000/login");
  });

  server.on("SIGTERM", () => {
    console.log("Server shutting down...");
    process.exit(0);
  });

  server.stdout.on("data", (data) => {
    console.log(data.toString());
  });

  server.on("close", () => {
    console.log("Server closed");
  });
};

//////////////////////////////////////////////////////////////////////////////


const cliMode = async (url, download_path = `${HOME}/Music`) => {

  const urlMode = identifyUrlType(url);

  // Kill any process running on port 3000 before starting the server
  try {
    await killPort(3000);
  } catch (error) {
    console.error(`Error killing process on port 3000: ${error.message}`);
  }

  const accessToken = await getAuthToken();
  if (urlMode === "yt-playlist" || urlMode === "yt-track") {
    downloadWithYtDlp(url, download_path, urlMode);
  } else if (
    urlMode === "sy-playlist" ||
    urlMode === "sy-track" ||
    urlMode === null
  ) {

    const playlist = await navigateSpotify(accessToken);
    
    let total = playlist.tracks.total;
    if (!playlist.tracks.total) {
      total = playlist.tracks.length;
    }
    console.log(
      `🎵 ${playlist.name} contains ${total} tracks! 🎶`
    );
    navigateSpotifyTracks(accessToken, playlist.id, download_path, total);

  } else {
    console.log("Invalid URL provided.");
    return;
  }
};

/**
 * Main entry point of the application.
 *
 * Parses command-line arguments and either starts
 * a server or runs the CLI mode.
 *
 * @returns {void}
 */
const main = () => {
  console.clear();
  printHeader();

  const program = new Command();

  // Define the command for CLI mode
  program
    .command('cli')
    .description('Run the app in CLI mode')
    .option("--url <url>", "URL to process (YouTube or Spotify) playlist or track")
    .option("--reset", "Reset stored credentials and start fresh")
    .option("--watch-dir <dir>", "Directory to watch for music files", `${HOME}/Music`)
    .option("--interval <minutes>", "Sync interval in minutes", "30")
    .action((options) => {
      // Handle CLI mode logic here
      cliMode(options.url, options.watchDir);
    });

  // Define the command for Sync mode
  program
    .command('sync')
    .description('Run the app in Sync mode')
    .option("--watch-dir <dir>", "Directory to watch for music files", `${HOME}/Music`)
    .option("--interval <minutes>", "Sync interval in minutes", "30")
    .action((options) => {
      // Handle Sync mode logic here
      const watchDir = options.watchDir || `${HOME}/Downloads`;
      const interval = parseInt(options.interval) || 30;
      startPlaylistSync(watchDir, interval);
    });

  // Set the program version and name
  program
    .name(`${blue}${bold}spotituby${clr}`)
    .description(`${yellow}${italic}Download music from Spotify playlists${clr}`)
    .version("1.0.0");

  // Add help text for examples
  program.addHelpText(
    "after",
    `
Examples:
${blue}spotituby cli ${yellow}--url ${green}https://open.spotify.com/playlist/4nT7b2XU4sVWp8Rt7A6WqI${clr}
${blue}spotituby cli ${yellow}--reset${clr}    # Reset stored credentials
${blue}spotituby sync ${yellow}--watch-dir ${green}/path/to/watch${clr}
`
  );

  // Parse the command line arguments
  program.parse(process.argv);
};

// Call the main function
main();
