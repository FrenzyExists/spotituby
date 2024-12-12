import axios from "axios";
import validUrl from "valid-url";
import { exec } from "child_process";
import { confirm, checkbox } from "@inquirer/prompts";
import NodeID3 from "node-id3";

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

    return tokenResponse.data.access_token;
  } catch (error) {
    console.error("Error fetching access token:", error);
    throw error;
  }
};


const getAuthToken = async () => {
  if (fs.existsSync(TOKENFILE)) {
    const token = fs.readFileSync(TOKENFILE, "utf-8");
    const test = await fetchMe(token);

    if (test !== null) {
      return token;
    }
  }

  // Start authentication server
  const server = fork(resolve(dirname(fileURLToPath(import.meta.url)), "../server.js"));
  const sleep = async ms => new Promise(r => setTimeout(r, ms));

  await sleep(2000);
  
  return new Promise(async (resolve, reject) => {
    const login = await loginToSpotify();
    if (!login) {
      server.kill();
      reject(new Error("Failed to login"));
      return;
    }

    server.on("message", async (authorizationCode) => {
      console.log("Authorization code received");
      // Save token to file
      fs.writeFileSync(TOKENFILE, authorizationCode);
      server.kill();
      resolve(authorizationCode);
    });
  });
};


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
	  // console.log(me)
	  // console.log("information about me")
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
  // console.log(f);
  
  NodeID3.update(tags, f, (e, buff) => {});
};

const TOKENFILE = ".token";
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
  getAuthToken
};
