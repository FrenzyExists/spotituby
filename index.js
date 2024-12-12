#!/usr/bin/env node

import {
  select,
  checkbox,
  input,
  password,
  search
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
  printHeader
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
import puppeteer from "puppeteer";
import os from "os";
import { deprecate } from "util";

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
        // console.log(choices); // debug
        
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
    
    await trackSelector(playlist).then((selectedTracks) =>{
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
  // console.log(user);
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
    if(pl) { // getting null values for some reason
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


const navigateSpotifyTracks = async (token, playlistId, download_path, track_size) => {
  try {
    // console.log(playlistId);
    let tracks = null
    if (playlistId !== 'liked-songs') {;
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
      
      searchAndDownloadYTTrack({metadata:t, outputDir:download_path, search: true});
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


async function loginToSpotify(maxAttempts = 3) {
  let attempts = 0;
  let browser;

  while (attempts < maxAttempts) {
    try {
      browser = await puppeteer.launch({
        headless: true
      });
      const page = await browser.newPage();

      await page.goto('http://localhost:3000/login');

      const username = await input({
        message: `Enter your username or email (attempt ${attempts + 1}/${maxAttempts}):`,
      });
      const password_field = await password({
        message: `Enter your password (attempt ${attempts + 1}/${maxAttempts}):`,
        mask: true,
        validate: (input) => {
          if (input.length < 6) {
            return "Password must be at least 6 characters long";
          }
          return true;
        }
      });

      // Wait for the username and password fields to load
      await page.waitForSelector('#login-username', {
        visible: true
      });
      await page.waitForSelector('#login-password', {
        visible: true
      });

      // Fill in the login form and submit
      await page.type('#login-username', username);
      await page.type('#login-password', password_field);

      // Click the login button
      await page.click('#login-button');

      console.log("Logging in...");

      try {
        console.log("Authorizing app to spotify account...");
        // Wait for navigation
        await page.waitForNavigation();
    
        // Wait for the selector
        await page.waitForSelector('.Button-sc-qlcn5g-0.hVnPpH', {
          timeout: 5000,
        });
        // Click the button
        await page.click('.Button-sc-qlcn5g-0.hVnPpH');
      } catch (e) {
        console.log("App is already authorized.");
      }

      try {
        const errorMessage = await page.waitForSelector('.sc-gLXSEc.eZHyFP', {
          visible: true,
          timeout: 2000
        }).catch(() => null);

        if (errorMessage) {
          console.log('Login failed. Please check your credentials.');
          attempts++;
          
          if (attempts < maxAttempts) {
            console.log(`You have ${maxAttempts - attempts} attempts remaining.`);
            await browser.close();
            continue;
          } else {
            await browser.close();
            return false;
          }
        } else {
          console.log('Login successful!');
          await browser.close();
          return true;
        }
      } catch (error) {
        if (error.name === 'TimeoutError') {
          // If we don't find an error message within timeout, assume login was successful
          console.log('Login successful!');
          await browser.close();
          return true;
        } else {
          console.error('An unexpected error occurred during login:', error);
          attempts++;
          
          if (attempts < maxAttempts) {
            console.log(`You have ${maxAttempts - attempts} attempts remaining.`);
            await browser.close();
            continue;
          } else {
            await browser.close();
            return false;
          }
        }
      }
    } catch (error) {
      console.error('An error occurred during login:', error);
      attempts++;
      
      if (attempts < maxAttempts) {
        console.log(`You have ${maxAttempts - attempts} attempts remaining.`);
        if (browser) await browser.close();
        continue;
      } else {
        if (browser) await browser.close();
        return false;
      }
    }
  }

  console.log('Maximum login attempts reached. Please try again later.');
  return false;
}


const cliMode = async (url, download_path=`${HOME}/Music`) => {
  
  const urlMode = identifyUrlType(url);
  let token = null;

  if (fs.existsSync(TOKENFILE)) {
    token = fs.readFileSync(TOKENFILE, "utf-8");

    const test = await fetchMe(token);

    if (test === null) {
      console.log("Invalid Spotify token found");
      token = null;
    }
  }

  if (urlMode === "yt-playlist" || urlMode === "yt-track") {
    downloadWithYtDlp(url, download_path, urlMode);
  } else if (
    urlMode === "sy-playlist" ||
    urlMode === "sy-track" ||
    urlMode === null
  ) {
    if (token === null) {
      const server = fork(serverPath);
      const sleep = async ms => new Promise(r => setTimeout(r, ms));

      await sleep(2000);
      const login = await loginToSpotify();
      if (!login) {
        console.log("Failed to login");
        server.kill();
        process.exit(1);
      }

      server.on("spawn", async () => {
        console.log(
          "Server started\nlog in to your spotify account on http://localhost:3000/login"
        );
      });

      server.on("message", async (authorizationCode) => {
        console.log("Authorization code received");
        token = authorizationCode;

        // Save token to file
        fs.writeFileSync(TOKENFILE, token);
        const playlist = await navigateSpotify(token);
        navigateSpotifyTracks(token, playlist.id, download_path, playlist.tracks.total);

        server.kill();
      });
    } else {
      console.log("Token found - skipping login");
      const playlist = await navigateSpotify(token);
      
      let total = playlist.tracks.total;
      if (!playlist.tracks.total) {
        total = playlist.tracks.length;
      }
      console.log(
        `🎵 ${playlist.name} contains ${total} tracks! 🎶`
      );
      navigateSpotifyTracks(token, playlist.id, download_path, total);
    }
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
    .option("--mode <mode>", "Mode to run the app in (cli)")
    .option(
      "--url <url>",
      "URL to process (YouTube or Spotify) playlist or track"
    )
    .option(
      "--reset",
      "Reset stored credentials and start fresh"
    )
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
  } else if (mode === "daemon") {
     // TODO: implement daemon mode for v1.0.3
  } else {
    program.outputHelp();
  }
};

main();
