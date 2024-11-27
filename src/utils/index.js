import axios from "axios";
import validUrl from "valid-url";
import { exec } from "child_process";
import {
  confirm,
  checkbox,
} from "@inquirer/prompts";

const sanitizeFileName = (name) => {
  return name.replace(/[<>:"/\\|?*]+/g, "");
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
const identifyUrlType = (url) => {
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
      return "yt-track"; // Shortened YouTube video link
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

/**
 * Fetches the user object from the Spotify API using the given access token.
 *
 * @param {string} accessToken The Spotify access token to use for the request
 * @returns {Promise<SpotifyApi.UserObjectFull>} The user object
 */
const fetchMe = async (accessToken) => {
  try {
    const me = await axios.get("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    return me.data;
  } catch (error) {
    console.log(
      "Can't reach you ",
      error.response?.status,
      error.response?.dat
    );
    // throw error;
    return null;
  }
};

/**
 * Fetches the user's playlists from the Spotify API using the given access token.
 *
 * @param {string} accessToken The Spotify access token to use for the request
 * @returns {Promise<SpotifyApi.PlaylistObject[]>} The user's playlists
 */
const fetchPlaylists = async (accessToken) => {
  try {
    const playlists = await axios.get(
      "https://api.spotify.com/v1/me/playlists",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    const d = playlists.data;
    return d;
  } catch (error) {
    throw error;
  }
};

/**
 * Searches for a YouTube track based on artist and title, and downloads it in MP3 format.
 *
 * @param {string|null} artist - The artist's name. Used in search query if provided.
 * @param {string|null} title - The track title. Used in search query if provided.
 * @param {string|null} outputDir - The directory where the downloaded file will be saved.
 * @param {number} resultsCount - The number of search results to consider. Defaults to 1.
 * @param {boolean} search - Flag to determine if a search should be performed. Defaults to true.
 * @param {string|null} url - Direct URL of the track, bypassing search if provided.
 */
const searchAndDownloadYTTrack = async (artist=null, title=null, outputDir=null, resultsCount = 1, search=true, url=null) => {
  const searchQuery = search && !url ? `ytsearch${resultsCount}:"${artist} - ${title}"` : `ytsearch${resultsCount}:"${artist} - ${title}"`;
  const urlQuery = url && !search ? `url:${url}` : "";
  // {"downloaded_bytes": 4111336, "total_bytes": 4111336, "filename": "./downloads/Voyage - Dynamic.webm", "status": "finished", "elapsed": 0.9414091110229492, "ctx_id": null, "speed": 4367215.0097767385, "_speed_str": "4.16MiB/s", "_total_bytes_str": "   3.92MiB", "_elapsed_str": "00:00:00", "_percent_str": "100.0%", "_default_template": "100% of    3.92MiB in 00:00:00 at 4.16MiB/s"} 
  const downloadQuery = `-x --audio-format mp3 -o "${outputDir}/%(title)s.%(ext)s" --quiet --progress --progress-template "%(progress._percent_str)s - %(progress._total_bytes_str)s ETA %(progress._eta_str)s"`;

  const command = `yt-dlp ${urlQuery} ${downloadQuery} ${searchQuery}`;

  const process = exec(command);
  process.stdio[1].on("data", (data) => {
    console.log(data.toString());
  });

  process.on("message", (message) => {
    console.log("------------------------------------------")
  })

  process.on("SIGINT", () => {
    console.log("SIGINT received, closing...");
    process.kill();
  });

};

const fetchPlaylistTracks = async (accessToken, playlistId) => {
  try {
    const tracks = await axios.get(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    const d = tracks.data;
    return d;
  } catch (error) {
    throw error;
  }
};

const trackSelector = async (choices) => {

  if (choices.length === 0) {
    throw new Error("No valid tracks found to process.");
  }

  const getAllTracks = await confirm({
    message: `Found ${choices.length} tracks in this playlist.\nDo you want to download all tracks? This may take a while 🤔`,
    default: false,
  }).catch( e => {
    console.log("Option Cancelled. Goodbye 👋");
    process.exit(0);
  });

  let selectedTracks = [];
  if (getAllTracks) {
    console.log("Downloading all tracks...");
    selectedTracks = await choices.map((c) => c.value);
  } else {
    console.log("Downloading selected track...");
    selectedTracks = await checkbox({
      message: `🎶 Select your songs 🎶`,
      choices: choices,
      validate: (ans) => {
        if (ans.length === 0) {
          return "You must select at least one song to download.";
        }
        return true;
      },
    }).catch(e => {
      console.log("Selection Cancelled. Goodbye 👋");
      process.exit(0);
    });
  }  
  return selectedTracks;
}


const TOKENFILE = ".token";
export {
  TOKENFILE,
  searchAndDownloadYTTrack,
  fetchPlaylistTracks,
  fetchPlaylists,
  sanitizeFileName,
  identifyUrlType,
  getClientAccessToken,
  fetchMe,
  trackSelector
};
