import {
  select,
  checkbox,
  input,
  search
} from "@inquirer/prompts";
import {
  identifyUrlType,
  fetchMe,
  fetchPlaylists,
  fetchPlaylistTracks,
  searchAndDownloadYTTrack,
  trackSelector,
  TOKENFILE
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
import {
  SingleBar,
  Presets
} from "cli-progress";
import fs from "fs";
import puppeteer from "puppeteer";
import os from "os";

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
          outputDir,
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
    searchAndDownloadYTTrack(url=url, search=false, outputDir=outputDir);
  }
};

const navigateSpotify = async (token) => {
  if (!token) {
    console.log("Error, no token found");
    return;
  }

  const user = await fetchMe(token);
  console.log(user);
  
  console.log(`welcome ${user.display_name}`);

  const playlists = await fetchPlaylists(token);
  let p = playlists.items;

  let choices = [];
  p.map((pl) => {
    choices.push({
      name: pl.name,
      value: {
        id: pl.id,
        name: pl.name,
        tracks: pl.tracks
      },
      description: pl.description
    });
  });
  let selectPlaylist = await select({
    message: "Select a playlist",
    choices: choices
  }).catch(e => {
    console.log("Selection Cancelled. Goodbye 👋");
    process.exit(0);
  });
  return selectPlaylist;
};


const navigateSpotifyTracks = async (token, playlistId, download_path) => {
  try {
    const tracks = await fetchPlaylistTracks(token, playlistId);

    if (!tracks || !tracks.items) {
      throw new Error("No tracks found in the playlist.");
    }

    const choices = tracks.items
      .map((t) => {
        return {
          name: `${t.track.name} - ${t.track.artists.map((a) => a.name).join(", ")}`, // Visible to user
          value: {
            name: t.track.name,
            name: t.track.name,
            duration_ms: t.track.duration_ms,
            name: t.track.name,
            duration_ms: t.track.duration_ms,
            artist: t.track.artists.map((a) => a.name),
            album: t.track.album.name,
            duration_ms: t.track.duration_ms,
            image: t.track.album.images?.[0]?.url || "",
            album_url: t.track.album.href,
            external_url: t.track.external_urls.spotify,
            popularity: t.track.popularity,
            disk_number: t.track.disc_number,
            track_number: t.track.track_number,
            release_date: t.track.album.release_date,
            type: t.track.type,
          },
        };
      });

    trackSelector(choices).then(async (selectedTracks) => selectedTracks.map((t) => {
      if (!t.artist || t.artist.length === 0) {
        console.warn(`Skipping track: ${t.name} due to missing artist information.`);
        return;
      }
      console.log(t.artist);
      
      searchAndDownloadYTTrack(t.artist[0], t.name, download_path, 1);
    }))
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

/////////////////////////////////////////////////////////////////////////////
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


async function loginToSpotify() {
  let browser = await puppeteer.launch({
    headless: true
  });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/login');
  // page.on('response', async (response) => {
  //     const url = response.url();
  //     if (url.includes('/callback')) { // This is the callback URL
  //         const responseBody = await response.json(); // Assuming the token is returned as JSON
  //         if (responseBody && responseBody.token) {
  //             console.log('Token received:', responseBody.token);
  //             // You can save the token to a file or process it here
  //             await browser.close(); // Close the browser if token is found
  //         } else {
  //             console.log('No token found in callback response');
  //         }
  //     }
  // });

  const username = await input({
    message: "Enter your username or email:",
  });
  const password = await input({
    message: "Enter your password:",
    type: "password",
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
  await page.type('#login-password', password);

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
      await browser.close();
      return false;
    } else {
      console.log('Login successful!');
      browser.close();
      return true;
    }
  } catch (error) {
    console.error('An error occurred during login:', error);
    await browser.close();
    return false;
  }
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
        navigateSpotifyTracks(token, playlist.id, download_path);

        server.kill();
      });
    } else {
      console.log("Token found - skipping login");
      const playlist = await navigateSpotify(token);
      console.log(
        `🎵 ${playlist.name} contains ${playlist.tracks.total} tracks! 🎶`
      );
      navigateSpotifyTracks(token, playlist.id, download_path);
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
  console.log(`
  \x1b[34m====================================\x1b[0m
  \x1b[34m  Spotituby: Revolutionizing Music  \x1b[0m
  \x1b[34m  That One Downloader You Need.  \x1b[0m
  \x1b[34m====================================\x1b[0m
`);

  const program = new Command();
  program
    .name("spotituby")
    .description("Download music from Spotify playlists")
    .version("1.0.0")
    .option("--mode <mode>", "Mode to run the app in (server or cli)")
    .option(
      "--url <url>",
      "URL to process (YouTube or Spotify) playlist or track"
    )
    .addHelpText(
      "after",
      `
    Examples:
    spotituby --mode cli
    spotituby --mode cli --url https://open.spotify.com/playlist/4nT7b2XU4sVWp8Rt7A6WqI
    spotituby --mode cli --url https://www.youtube.com/playlist?list=PLv9ZK9k7ZDjW5mDlMQm4eMjR4kxY9e8Ji
    spotituby --mode server --url https://open.spotify.com/playlist/4nT7b2XU4sVWp8Rt7A6WqI
    spotituby --mode server --url https://www.youtube.com/playlist?list=PLv9ZK9k7ZDjW5mDlMQm4eMjR4kxY9e8Ji
    `
    );

  program.parse(process.argv);

  const mode = program.opts().mode;
  const url = program.opts().url;
  const download_path = program.opts().path

  if (mode === "cli") {
    cliMode(url, download_path);
  } else if (mode === "server") {
    serverMode(url);
  } else {
    program.outputHelp();
  }
};

main();