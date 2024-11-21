// const fs = require("fs");
// const { Command } = require("commander");
import { select, confirm, checkbox } from "@inquirer/prompts";
import {
  identifyUrlType,
  fetchMe,
  fetchPlaylists,
  fetchPlaylistTracks,
  searchAndDownloadYTTrack,
  TOKENFILE
} from "./src/utils/index.js";
import { Command } from "commander";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { exec, fork, spawn } from "child_process";
import { SingleBar, Presets } from "cli-progress";
import fs from "fs";
import axios from "axios";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Now you can use __dirname as before
const serverPath = resolve(__dirname, "src", "server.js");

const downloadWithYtDlp = (url, outputDir, yt_type) => {
  const getCommand = `yt-dlp --flat-playlist "${url}" --dump-json "${url}"`;

  if (yt_type === "yt-playlist") {
    console.log("Downloading playlist...");

    console.log(getCommand);
    let b;
    exec(getCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error during download: ${error.message}`);
        return;
      }
      try {
        const playlistVideos = stdout
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line));

        const choices = playlistVideos
          .map((v) => ({
            name: v.title,
            value: v.url
          }))
          .concat([
            {
              name: "All videos",
              value: null
            }
          ]);

        checkbox({
          message: `Found ${playlistVideos.length} videos in the playlist.\nSelect a song to download`,
          choices: choices,
          validate: (ans) => {
            if (ans.length === 0) {
              return "You must select at least one song to download.";
            }
            return true;
          }
        }).then((ans) => {
          if (ans === null) {
            const progressBar = new SingleBar(
              {
                format: "Downloading |{bar}| {percentage}% || {total}MiB"
              },
              Presets.shades_classic
            );

            playlistVideos.map((v) => {
              const process = exec(
                `yt-dlp ${v.url} -x --audio-format mp3 -o "${outputDir}/%(title)s.%(ext)s"`
              );
            });
          } else {
            const progressBar = new SingleBar(
              {
                format: "Downloading |{bar}| {percentage}% || {total}MiB"
              },
              Presets.shades_classic
            );

            const process = exec(
              `yt-dlp ${ans} -x --audio-format mp3 -o "${outputDir}/%(title)s.%(ext)s"`
            );

            let total = 100;
            process.stdio[1].on("data", (data) => {
              const matchTotal = data.toString().match(/(\d+\.\d+MiB)/);
              if (matchTotal) {
                total = parseFloat(matchTotal[1].replace("MiB", ""));

                if (!progressBar.isActive) {
                  progressBar.start(total, 0);
                }
              }

              const match = data.toString().match(/(\d+\.\d+%)/);
              if (match) {
                const downloaded =
                  (parseFloat(match[1].replace("%", "")) / 100) * total;

                progressBar.update(downloaded);
              }
            });

            process.on("close", (code) => {
              if (code === 0) {
                progressBar.stop();
                console.log("Download completed successfully!");
              } else {
                progressBar.stop();
                console.error(`Download failed with code ${code}`);
              }
            });
          }
        });
      } catch (error) {
        console.error(`Error parsing JSON: ${error.message}`);
        return;
      }
    });
  } else if (yt_type === "yt-track") {
    console.log("Downloading track...");
  } else {
    console.log("Unknown type");
    return;
  }
};

const navigateSpotify = async (token) => {
  if (!token) {
    console.log("Error, no token found");
    return;
  }

  const user = await fetchMe(token);
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
  });
  return selectPlaylist;
};

const navigateSpotifyTracks = async (token, playlistId) => {
  const tracks = await fetchPlaylistTracks(token, playlistId);

  console.log(tracks.items[0]);
  console.log(tracks.items[0].track.name);
  let choices = tracks.items.map((t) => {
    return {
      name: t.track.name,
      duration_ms: t.track.duration_ms,
      artist: t.track.artists.map((a) => a.name),
      album: t.track.album.name,
      image: t.track.album.images[0].url,
      album_url: t.track.album.href,
      external_url: t.track.external_urls.spotify,
      popularity: t.track.popularity,
      disk_number: t.track.disc_number,
      track_number: t.track.track_number,
      release_date: t.track.album.release_date,
      type: t.track.type
    };
  });

  // const selectionselect({
  //   message: "🎶 Select a song 🎶",
  //   choices: choices
  // })
  const getAllTracks = await confirm({
    message: "Do you want to download all tracks?",
    default: false
  });

  if (getAllTracks) {
    console.log("Downloading all tracks...");
    selectedTracks = choices;
  } else {
    console.log("Downloading selected track...");
    const selectedTracks = await checkbox({
      message: "Select tracks to download",
      choices: choices,
      validate: (ans) => {
        if (ans.length === 0) {
          return "You must select at least one song to download.";
        }
        return true;
      }
    });
  }
  selectedTracks.map((t) => {
    searchAndDownloadYTTrack(t.artist[0], t.name, "./downloads", 1);
  });
};

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

const cliMode = async (url) => {
  const urlMode = identifyUrlType(url);
  let token = null;

  if (fs.existsSync(TOKENFILE)) {
    token = fs.readFileSync(TOKENFILE, "utf-8");

    const test = await fetchMe(token);

    if (test === null) {
      console.log("Invalid token found");
      token = null;
    }
  }

  if (urlMode === "yt-playlist") {
    downloadWithYtDlp(url, "./downloads", urlMode);
  } else if (
    urlMode === "sy-playlist" ||
    urlMode === "sy-track" ||
    urlMode === null
  ) {
    if (token === null) {
      const server = fork(serverPath);
      console.log("Server stardddted");
      console.log(token);
      console.log("Server sddtarted");

      server.on("spawn", () => {
        console.log(
          "Server started\nlog in to your spotify account on http://localhost:3000/login"
        );
      });

      server.on("message", async (authorizationCode) => {
        console.log("Authorization code received");
        token = authorizationCode;

        // Save token to file
        fs.writeFileSync(TOKENFILE, token);
        server.kill(); // Kill the server process once done
        const playlistId = await navigateSpotify(token);
        navigateSpotifyTracks(token, playlistId);
      });
    } else {
      console.log("Token found - skipping login");
      const playlist = await navigateSpotify(token);
      console.log(
        `🎵 ${playlist.name} contains ${playlist.tracks.total} tracks! 🎶`
      );
      navigateSpotifyTracks(token, playlist.id);
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
      spotituby --mode cli --url https://open.spotify.com/playlist/4nT7b2XU4sVWp8Rt7A6WqI
      spotituby --mode cli --url https://www.youtube.com/playlist?list=PLv9ZK9k7ZDjW5mDlMQm4eMjR4kxY9e8Ji
      spotituby --mode server --url https://open.spotify.com/playlist/4nT7b2XU4sVWp8Rt7A6WqI
      spotituby --mode server --url https://www.youtube.com/playlist?list=PLv9ZK9k7ZDjW5mDlMQm4eMjR4kxY9e8Ji
      `
    );

  program.parse(process.argv);

  const mode = program.opts().mode;
  const url = program.opts().url;

  if (mode === "cli") {
    cliMode(url);
  } else if (mode === "server") {
    serverMode(url);
  } else {
    program.outputHelp();
  }
};

main();
