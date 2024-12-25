import axios from "axios";
import validUrl from "valid-url";
import { exec, fork } from "child_process";
import NodeID3 from "node-id3";
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import puppeteer from "puppeteer";
import {
  confirm, checkbox,
  input,
  password
} from "@inquirer/prompts";
import querystring from 'querystring'
import { client_id, secret } from "./dotenv.js";
import { green, clr } from "./colors.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const TOKENFILE = ".token";

const sanitizeFileName = name => {
  return name.replace(/[<>:"/\\|?*]+/g, "");
};

const sanitizeArrays = arr => {
  return arr.filter(item => item !== null);
};

/**
 * Identifies the type of a given URL.
 *
 * @param {string} url URL to identify
 * @returns {string|null} Type of the URL, or null if the type could not be determined.
 * The type can be one of the following:
 * - 'yt-track' if the URL is a YouTube track URL
 * - 'yt-playlist' if the URL is a YouTube playlist URL
 * - 'sy-track' if the URL is a Spotify track URL
 * - 'sy-playlist' if the URL is a Spotify playlist URL
 */
const identifyUrlType = url => {
  if (!url) return null;

  // Validate URL format
  if (!validUrl.isUri(url)) {
    throw new Error("Invalid URL provided.");
  }

  try {
    // Parse the URL
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;
    const searchParams = parsedUrl.searchParams;

    // YouTube URLs
    if (hostname === "www.youtube.com" || hostname === "youtube.com") {
      if (searchParams.has("list")) return "yt-playlist"; // Playlist
      if (searchParams.has("v")) return "yt-track"; // Video
    }

    if (hostname === "youtu.be") {
      return "yt-track"; // YouTube video link
    }

    // Spotify URLs
    if (hostname === "open.spotify.com") {
      const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);
      if (pathSegments[0] === "playlist") return "sy-playlist"; // Playlist
      if (pathSegments[0] === "track") return "sy-track"; // Track
    }

    return null; // Unrecognized URL type
  } catch (error) {
    throw new Error("Error parsing URL: " + error.message);
  }
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
 * Logs in to Spotify using Puppeteer to automate the login process.
 *
 * This function attempts to log in to a Spotify account by navigating to the login page,
 * entering the username and password, and handling any potential errors or authorization
 * prompts. It will retry the login process a specified number of times if it fails.
 *
 * @param {number} [maxAttempts=3] - The maximum number of login attempts before failing.
 * @returns {Promise<boolean>} - A promise that resolves to true if the login was successful,
 *                               or false if it failed after the maximum number of attempts.
 * @throws {Error} - Throws an error if an unexpected error occurs during the login process.
 */
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
      } catch (e) {}// dont say anything

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
          console.log(`${green}Login successful!${clr}`);
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

/**
 * Fetches a Spotify access token using the client credentials flow.
 *
 * @param {string} clientId The Spotify client ID
 * @param {string} clientSecret The Spotify client secret
 * @returns {Promise<string>} The access token
 * @throws An error if the token could not be fetched
 * @deprecated Dont use this, use getAuthToken instead
 */
const getClientAccessToken = async (clientId, clientSecret) => {
  try {
    const tokenResponse = await axios.post(
      "https://accounts.spotify.com/api/token",
      null,
      {
        params: {
          grant_type: "client_credentials"
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${clientId}:${clientSecret}`
          ).toString("base64")}`
        }
      }
    );

    const newAccessToken = tokenResponse.data.access_token;
    const refreshToken = tokenResponse.data.refresh_token;
    const expiresIn = tokenResponse.data.expires_in;
    const expiresAt = Date.now() + expiresIn * 1000; // Calculate expiry time in milliseconds

    return {
      accessToken: newAccessToken,
      refreshToken: refreshToken,
      expiresIn: expiresIn,
      expiresAt: expiresAt
    };
  } catch (error) {
    console.error("Error fetching access token:", error);
    throw error;
  }
};

// New function to refresh the access token
const refreshAccessToken = async (refreshToken) => {
  
  try {
    const tokenResponse = await axios.post(
      "https://accounts.spotify.com/api/token",
      querystring.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: client_id,
        client_secret: secret
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    console.log("REFRESH",tokenResponse.data );
    
    const newAccessToken = tokenResponse.data.access_token;
    const expiresIn = tokenResponse.data.expires_in;
    const expiresAt = Date.now() + expiresIn * 1000; // Calculate expiry time in milliseconds

    return {
      accessToken: newAccessToken,
      refreshToken: refreshToken,
      expiresIn: expiresIn,
      expiresAt: expiresAt
    };
  } catch (error) {
    console.error("Error refreshing access token:", error.message);
    return null;
  }
};


/**
 * Asynchronous function to retrieve an authorization token.
 * 
 * This function checks for an existing token file and validates its contents.
 * If the token is expired or about to expire, it attempts to refresh it.
 * If any error occurs during the process, it attempts to login and retrieve a new token.
 * 
 * @returns {Promise<string>} - A promise that resolves to the access token.
 * @throws {Error} - Throws an error if the token file is not found or if token data is invalid.
 */
const getAuthToken = async () => {
  try {
    if (!existsSync(TOKENFILE)) {
      throw new Error("No token file found");
    }
    const { accessToken, refreshToken, expiresAt } = JSON.parse(readFileSync(TOKENFILE, "utf-8"));

    // Validate required fields
    if (!accessToken || !refreshToken || !expiresAt) {
      throw new Error("Invalid token data format");
    }

    const bufferTime = 60 * 1000; // 60 seconds in milliseconds
    
    // Check if the token is expired
    if (Date.now() + bufferTime < expiresAt) {
      return accessToken; // Token is still valid
    }

    // Token is expired or about to expire, refresh it
    console.log("Refreshing expired token...");
    const newTokenData = await refreshAccessToken(refreshToken);

    if (!newTokenData) {
      throw new Error("Failed to refresh token");
    }

    writeFileSync(TOKENFILE, JSON.stringify(newTokenData));
    return newTokenData.accessToken;

  } catch (error) {
    const server_path = resolve(__dirname, "../", "server.js")
    const server = fork(server_path);
    const sleep = async ms => new Promise(r => setTimeout(r, ms));
  
    await sleep(2000); // If I dont use this I get a weird race condition
  
    return new Promise(async (resolve, reject) => {
      const login = await loginToSpotify();
      if (!login) {
        server.kill()
        reject(new Error("Failed to login"));
        return;
      }
    // try {
    //   await killPort(3000);
    // } catch (error) {
    //   console.error(`Error killing process on port 3000: ${error.message}`);
    // }
      server.on("message", async (authorization_code) => {
        console.log("Authorization code received");
        writeFileSync(TOKENFILE, JSON.stringify(authorization_code));
        server.kill();
        const newAccessToken = authorization_code.accessToken;
        resolve(newAccessToken);
      });
    });
  }
}

/**
 * Fetches the user object from the Spotify API using the given access token.
 *
 * @param {string} accessToken The Spotify access token to use for the request
 * @returns {Promise<SpotifyApi.UserObjectFull>} The user object
 */
const fetchMe = async accessToken => {
  try {
    const me = await axios.get("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    return me.data;
  } catch (error) {
    // console.log(error)
    return null;
  }
};


const fetchTrack = async (accessToken, track_name, track_artist) => {
  try {
    const me = await axios.get(`https://api.spotify.com/v1/search?q=${track_name}+${track_artist}&type=track&limit=1`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    return me.data;
  } catch (error) {
    return null;
  }
}

/**
 * Fetches the user's playlists from the Spotify API using the given access token.
 *
 * @param {string} accessToken The Spotify access token to use for the request
 * @returns {Promise<SpotifyApi.PlaylistObject[]>} The user's playlists
 */
const fetchPlaylists = async (accessToken, page_size = -1) => {
  let playlists = [];
  let nextUrl = `https://api.spotify.com/v1/me/playlists?limit=${page_size === -1 ? 50 : page_size}`;

  try {
    // First verify the token is valid
    const user = await fetchMe(accessToken);
    if (!user) {
      // Get new token if current one is invalid
      accessToken = await getAuthToken();
    }

    while (nextUrl) {
      const response = await axios.get(nextUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      playlists = playlists.concat(response.data.items);
      nextUrl = page_size === -1 ? response.data.next : null;
    }

    playlists = playlists.filter(playlist => playlist !== null);

    const liked = await fetchLikedTracks(accessToken)

    playlists.push({
      name: "Liked Songs",
      id: 'liked-songs',
      tracks: liked,
      description: "All your liked songs in one single playlist"
    })

    return playlists;
  } catch (error) {
    console.error("Error fetching playlists:", error.message);
    throw error;
  }
};


const fetchAlbums = async accessToken => {
  try {
    const playlists = await axios.get("https://api.spotify.com/v1/me/albums", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    const d = playlists.data;
    return d;
  } catch (error) {
    throw error;
  }
};

/**
 * Asynchronous function to fetch liked tracks from Spotify.
 * 
 * This function retrieves the user's liked tracks from Spotify using pagination.
 * It continues fetching tracks until all are retrieved or the specified page size is reached.
 * 
 * @param {string} accessToken - The access token for Spotify API authentication.
 * @param {number} [pageSize=-1] - The total number of tracks to fetch. If set to -1, fetches all tracks.
 * @returns {Promise<Array>} - A promise that resolves to an array of liked tracks.
 * @throws {Error} - Throws an error if the request to fetch tracks fails.
 */
const fetchLikedTracks = async (accessToken, pageSize = -1) => {
  try {
    const maxPageSize = 50;
    let totalTracks = [];
    let offset = 0;

    while (true) {
      const limit = pageSize === -1 ? maxPageSize : Math.min(maxPageSize, pageSize - offset);
      const response = await axios.get("https://api.spotify.com/v1/me/tracks", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        params: {
          limit,
          offset
        }
      });

      // Add the current batch of tracks to the total list
      totalTracks = totalTracks.concat(response.data.items);

      // Update the offset for the next batch
      offset += limit;

      // If there are no more tracks or we've fetched the required number, break
      if (!response.data.next || (pageSize !== -1 && offset >= pageSize)) {
        break;
      }
    }
    return totalTracks;
  } catch (error) {
    console.error("Error fetching liked tracks:", error.message);
    throw error;
  }
};


const getFilenameFromCommand = (metadataCommand, outputDir) => {
  return new Promise((resolve, reject) => {
    const titleProcess = exec(metadataCommand);

    let filename = "";
    titleProcess.stdout.on("data", (data) => {
      filename = `${outputDir}/${data.trim()}`; // Construct the filename
    });
    console.log(filename);

    titleProcess.on("exit", (code) => {
      if (code === 0) {
        resolve(filename);
      } else {
        reject(new Error("Failed to retrieve filename"));
      }
    });

    titleProcess.on("error", (err) => {
      reject(err);
    });
  });
};


/**
 * Searches for a YouTube track based on artist and title, and downloads it in MP3 format.
 *
 * @param {object|null} metadata - Metadata stuff
 * @param {string|null} outputDir - The directory where the downloaded file will be saved.
 * @param {number} resultsCount - The number of search results to consider. Defaults to 1.
 * @param {boolean} search - Flag to determine if a search should be performed. Defaults to true.
 * @param {string|null} url - Direct URL of the track, bypassing search if provided.
 */
const searchAndDownloadYTTrack = async ({
  metadata = null,
  outputDir = null,
  resultsCount = 5,
  search = true,
  url = null,
}) => {
  // Function to execute a shell command and return the result as a promise
  const executeCommand = (command) => {
    return new Promise((resolve, reject) => {
      const process = exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout.trim());
        }
      });
    });
  };

  if (!metadata) {

  }

  try {
    // Determine the URL to download from
    if (!url && search && metadata) {
      const searchQuery = `ytsearch${resultsCount}:\"${metadata.artist} - ${metadata.name}\"`;
      const filterQuery = `--reject-title \"official video|music video\"`;

      const searchCommand = `yt-dlp ${searchQuery} ${filterQuery} --print \"%(webpage_url)s\" 2>/dev/null | head -n 1`;
      // console.log(`Executing search command: ${searchCommand}`);

      url = await executeCommand(searchCommand);

      if (!url) {
        throw new Error("No results found for the given metadata.");
      }
    }

    // Ensure URL is defined
    if (!url) {
      throw new Error("A valid URL or metadata for search is required.");
    }


    let n = metadata?.name;
    if (!n) {
      n = "%(title)s"
    }
    // Download the track
    const downloadQuery = `-x --audio-format mp3 -o \"${outputDir}/${n}.%(ext)s\" --quiet --progress --progress-template \"%(progress._percent_str)s - %(progress._total_bytes_str)s ETA %(progress._eta_str)s\"`;
    const downloadCommand = `yt-dlp ${url} ${downloadQuery}`;

    // console.log(`Executing download command: ${downloadCommand}`);

    await executeCommand(downloadCommand);

    console.log("Download completed successfully.");

    // Retrieve metadata for the downloaded file
    const metadataCommand = `yt-dlp ${url} --print \"${n}.%(ext)s\"`;
    console.log(`Retrieving metadata with command: ${metadataCommand}`);

    const filename = await executeCommand(metadataCommand);

    console.log(`Downloaded file: ${filename}`);

    // Write metadata to the file
    if (metadata) {
      try {
        await writeMetadata(metadata, `${outputDir}/${filename}`);
        console.log("Metadata written successfully!");
      } catch (error) {
        console.error("Error writing metadata:", error);
      }
    }
  } catch (error) {
    console.error("Error in searchAndDownloadYTTrack:", error);
  }
};

const fetchPlaylistTracks = async (accessToken, playlistId, pageSize = 50) => {
  try {
    const maxPageSize = 50;
    let totalTracks = [];
    let offset = 0;

    // Paginate if pageSize exceeds 50
    while (offset < pageSize) {
      const limit = Math.min(maxPageSize, pageSize - offset); // Fetch only the required amount
      const response = await axios.get(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          params: {
            limit,
            offset
          }
        }
      );

      totalTracks = totalTracks.concat(response.data.items);
      offset += limit;

      if (!response.data.next) {
        break;
      }
    }

    return totalTracks;
  } catch (error) {
    console.error("Error fetching playlist tracks:", error.message);
    throw error;
  }
};

/**
 * Presents user with a checkbox prompt to select tracks from a playlist.
 *
 * If user selects to download all tracks, it will return an array of all track
 * objects. If user selects specific tracks, it will return an array of the
 * selected track objects.
 *
 * @param {array} choices - An array of track objects to be selected from. Each
 * track object should have a `name` and a `value` property.
 * @returns {array} An array of selected track objects.
 */
const trackSelector = async choices => {
  if (choices.length === 0) {
    throw new Error("No valid tracks found to process.");
  }

  const getAllTracks = await confirm({
    message: `Found ${choices.length} tracks in this playlist.\nDo you want to download all tracks? This may take a while 🤔`,
    default: false
  }).catch(e => {
    console.log("Option Cancelled. Goodbye 👋");
    process.exit(0);
  });

  let selectedTracks = [];
  if (getAllTracks) {
    console.log("Downloading all tracks...");
    selectedTracks = await choices.map(c => c.value);
  } else {
    console.log("Downloading selected track...");
    selectedTracks = await checkbox({
      message: `🎶 Select your songs 🎶`,
      choices: choices,
      validate: ans => {
        if (ans.length === 0) {
          return "You must select at least one song to download.";
        }
        return true;
      }
    }).catch(e => {
      console.log("Selection Cancelled. Goodbye 👋");
      process.exit(0);
    });
  }
  return selectedTracks;
};

const fetchImage = async imageUrl => {
  try {
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer"
    });

    // Return the buffer and MIME type
    return Buffer.from(response.data);
  } catch (error) {
    console.error("Error fetching image:", error.message);
    throw new Error("Failed to fetch image");
  }
};


/**
 * Writes metadata tags to the specified music file.
 *
 * This function takes track information and a file path,
 * then writes metadata tags such as title, artist, album,
 * year, track number, and more to the music file.
 *
 * @param {object} info - An object containing metadata information about the track.
 * @param {string} info.name - The title of the track.
 * @param {string[]} info.artist - An array of artist names.
 * @param {string} info.album - The album name of the track.
 * @param {string} info.release_date - The release date of the track in YYYY-MM-DD format.
 * @param {number} info.track_number - The track number in the album.
 * @param {number} info.duration_ms - The duration of the track in milliseconds.
 * @param {string} info.isrc - The International Standard Recording Code of the track.
 * @param {string} info.image - URL to the image associated with the track.
 * @param {boolean} info.explicit - Indicates if the track contains explicit content.
 * @param {string} filepath - The path to the music file where metadata will be written.
 */
const writeMetadata = async (info, filepath) => {
  // fetch image url
  const img = await fetchImage(info.image);

  const tags = {
    title: info.name,
    artist: info.artist.join(", "), // TPE1
    album: info.album, // TALB
    year: info.release_date.split("-")[0], // TYER
    date: info.release_date.replace(/-/g, ""), // TDAT (Format: DDMM)
    trackNumber: `${info.track_number}`, // TRCK
    disc_number: info.disc_number,
    length: `${Math.round(info.duration_ms / 1000)}`, // TLEN in seconds
    ISRC: info.isrc, // TSRC
    mediaType: "Digital", // TMED
    APIC: img,
    comment: info.explicit ? "Explicit content" : "Clean content", // COMM
    originalTitle: info.name // TOAL
  };

  let f = filepath.replace(/\.[^/.]+$/, ".mp3");

  NodeID3.update(tags, f, (e, buff) => { });
};

const printHeader = () => {
  const packageJson = JSON.parse(
    readFileSync(resolve(__dirname, '../../package.json'), 'utf8')
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

/**
 * Kills any process running on the specified port.
 *
 * @param {number} port - The port number to check.
 * @returns {Promise<void>}
 */
const killPort = (port) => {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32'
      ? `netstat -ano | findstr :${port}` // Windows command
      : `lsof -t -i:${port}`; // Unix command

    exec(command, (error, stdout) => {
      if (error) {
        // If the error is due to no processes found, we can ignore it
        if (stdout.trim() === '') {
          return resolve(); // No processes found, resolve without error
        }
        return reject(error); // Some other error occurred
      }

      const pids = stdout.split('\n').filter(Boolean);
      if (pids.length > 0) {
        const killCommand = process.platform === 'win32'
          ? `taskkill /PID ${pids.join(' /PID ')} /F` // Windows kill command
          : `kill -9 ${pids.join(' ')}`; // Unix kill command

        exec(killCommand, (killError) => {
          if (killError) {
            return reject(killError);
          }
          console.log(`Killed process(es) running on port ${port}`);
          resolve();
        });
      } else {
        resolve(); // No process found on the port
      }
    });
  });
};


export {
  TOKENFILE,
  fetchAlbums,
  sanitizeArrays,
  searchAndDownloadYTTrack,
  fetchPlaylistTracks,
  fetchPlaylists,
  sanitizeFileName,
  identifyUrlType,
  getClientAccessToken,
  fetchMe,
  fetchLikedTracks,
  trackSelector,
  fetchTrack,
  getAuthToken,
  printHeader,
  killPort,
  refreshAccessToken,
  navigateSpotifyTracks
};
