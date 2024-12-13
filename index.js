#!/usr/bin/env node

import {
  select,
} from "@inquirer/prompts";
import {
  identifyUrlType,
  fetchMe,
  fetchPlaylists,
  fetchPlaylistTracks,
  searchAndDownloadYTTrack,
  trackSelector,
  TOKENFILE,
  fetchLikedTracks,
  printHeader,
  getAuthToken,
  killPort
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
import fs from "fs";
import os from "os";
import sync from "./src/utils/sync.js";


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
  console.log(`welcome ${user.display_name}`);

  let playlists = await fetchPlaylists(token);

  const liked = await fetchLikedTracks(token)
  // let l = liked.items.map(tr => tr.track)

  playlists.push({
    name: "Liked Songs",
    id: 'liked-songs',
    tracks: liked,
    description: "All your liked songs in one single playlist"
  })

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
 * Navigates Spotify tracks based on the provided playlist ID and downloads them.
 *
 * @param {string} token - The access token for Spotify API authentication.
 * @param {string} playlistId - The ID of the playlist to fetch tracks from.
 * @param {string} download_path - The directory path where the tracks will be downloaded.
 * @param {number} track_size - The maximum number of tracks to fetch from the playlist.
 * @throws {Error} Throws an error if no tracks are found in the playlist.
 * @returns {Promise<void>} A promise that resolves when the tracks have been processed.
 */
const navigateSpotifyTracks = async (token, playlistId, download_path, track_size) => {
  try {
    // console.log(playlistId);
    let tracks = null
    if (playlistId !== 'liked-songs') {
      ;
      tracks = await fetchPlaylistTracks(token, playlistId, track_size);
    } else {
      tracks = await fetchLikedTracks(token, track_size);
    }

    if (!tracks) {
      throw new Error("No tracks found in the playlist.");
    }

    const choices = tracks
      .map((t) => {

        return {
          name: `${t.track.name} - ${t.track.artists.map((a) => a.name).join(", ")}`, // Visible to user
          value: {
            name: t.track.name,
            duration_ms: t.track.duration_ms,
            artist: t.track.artists.map((a) => a.name),
            album: t.track.album.name,
            image: t.track.album.images?.[0]?.url || "",
            album_url: t.track.album.href,
            external_url: t.track.external_urls.spotify,
            popularity: t.track.popularity,
            disk_number: t.track.disc_number,
            track_number: t.track.track_number,
            release_date: t.track.album.release_date,
            type: t.track.type,
            explicit: t.track.explicit,
            isrc: t.track.external_ids.isrc
          },
        };
      });

    trackSelector(choices).then(async (selectedTracks) => selectedTracks.map((t) => {
      if (!t.artist || t.artist.length === 0) {
        console.warn(`Skipping track: ${t.name} due to missing artist information.`);
        return;
      }

      searchAndDownloadYTTrack({ metadata: t, outputDir: download_path, search: true });
    }))
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}


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
  console.clear()
  printHeader();

  const program = new Command();
  program
    .name(`\x1b[34mspotituby\x1b[0m`)
    .description(`\x1b[33mDownload music from Spotify playlists\x1b[0m`)
    .version("1.0.0")
    .option("--mode <mode>", "Mode to run the app in (cli/sync)")
    .option(
      "--url <url>",
      "URL to process (YouTube or Spotify) playlist or track"
    )
    .option(
      "--reset",
      "Reset stored credentials and start fresh"
    )
    .option("--watch-dir <dir>", "Directory to watch for music files", `${HOME}/Music`)
    .option("--interval <minutes>", "Sync interval in minutes", "30")
    .addHelpText(
      "after",
      `
    Examples:
    \x1b[34mspotituby \x1b[33m--mode \x1b[31mcli\x1b[0m
    \x1b[34mspotituby \x1b[33m--mode \x1b[31mcli \x1b[33m--url \x1b[31mhttps://open.spotify.com/playlist/4nT7b2XU4sVWp8Rt7A6WqI\x1b[0m
    \x1b[34mspotituby \x1b[33m--mode \x1b[31mcli \x1b[33m--url \x1b[31mhttps://www.youtube.com/playlist?list=PLv9ZK9k7ZDjW5mDlMQm4eMjR4kxY9e8Ji\x1b[0m
    \x1b[34mspotituby \x1b[33m--reset\x1b[0m    # Reset stored credentials
    `
    );

  program.parse(process.argv);

  const options = program.opts();
  const mode = options.mode;
  const url = options.url;
  const download_path = options.path;
  const reset = options.reset;

  // Handle reset option
  if (reset) {
    try {
      if (fs.existsSync(TOKENFILE)) {
        fs.unlinkSync(TOKENFILE);
        console.log('\x1b[32m%s\x1b[0m', '✔ Credentials reset successfully');
      } else {
        console.log('\x1b[33m%s\x1b[0m', 'ℹ No stored credentials found');
      }
      process.exit(0);
    } catch (error) {
      console.error('\x1b[31m%s\x1b[0m', '✘ Error resetting credentials:', error.message);
      process.exit(1);
    }
  }

  if (mode === "cli") {
    cliMode(url, download_path);
  } else if (mode === "sync") {
    // TODO: implement daemon mode for v1.0.3
    const watchDir = options.watchDir || `${HOME}/Music`;
    const interval = parseInt(options.interval) || 30;

    sync.watcherSetup(watchDir)

  } else {
    program.outputHelp();
  }
};

main();
