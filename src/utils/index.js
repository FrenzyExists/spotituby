import axios from "axios";
import validUrl from "valid-url";
import { SingleBar, Presets } from "cli-progress";
import { exec } from "child_process";

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

const searchAndDownloadYTTrack = async (artist, title, outputDir, resultsCount = 1) => {
  const searchQuery = `ytsearch${resultsCount}:"${artist} - ${title}"`;
  // {"downloaded_bytes": 4111336, "total_bytes": 4111336, "filename": "./downloads/Voyage - Dynamic.webm", "status": "finished", "elapsed": 0.9414091110229492, "ctx_id": null, "speed": 4367215.0097767385, "_speed_str": "4.16MiB/s", "_total_bytes_str": "   3.92MiB", "_elapsed_str": "00:00:00", "_percent_str": "100.0%", "_default_template": "100% of    3.92MiB in 00:00:00 at 4.16MiB/s"} 
  const downloadQuery = `-x --audio-format mp3 -o "${outputDir}/%(title)s.%(ext)s" --quiet --progress --progress-template "%(progress._percent_str)s - %(progress._total_bytes_str)s ETA %(progress._eta_str)s"`;


  // const progressBar = new SingleBar(
  //   {
  //     format: "Downloading |{bar}| {percentage}% || {total}MiB"
  //   },
  //   Presets.shades_classic
  // );
  const command = `yt-dlp ${downloadQuery} ${searchQuery}`;

  let total = 100;
  const process = exec(command);
  process.stdio[1].on("data", (data) => {
    console.log(data.toString());
    
    // let matchTotal = data.toString()
    // matchTotal = matchTotal.replace(/\[download\]\s+/, "");
    // console.log(matchTotal);
    
    // const matchTotal = data.toString().match(/(\d+\.\d+MiB)/);
    // if (matchTotal) {
    //   total = parseFloat(matchTotal[1].replace("MiB", ""));

    //   if (!progressBar.isActive) {
    //     progressBar.start(total, 0);
    //   }
    // }

    // const match = data.toString().match(/(\d+\.\d+%)/);    
    // if (match) {
    //   let downloaded = (parseFloat(match[1].replace("%", "")) / 100) * total;
    //   if (total === downloaded) {
    //     progressBar.stop();
    //     console.log("Download completed successfully!");
    //     downloaded = 0;
    //   } else {
    //     progressBar.update(downloaded);
    //   }
    // }
  });

  process.on("message", (message) => {
    console.log("------------------------------------------")
  })

  // process.on("close", (code) => {
  //   if (code === 0) {
  //     progressBar.stop();
  //   } else {
  //     progressBar.stop();
  //     console.error(`Download failed with code ${code}`);
  //   }
  // });
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

const TOKENFILE = ".token";
export {
  TOKENFILE,
  searchAndDownloadYTTrack,
  fetchPlaylistTracks,
  fetchPlaylists,
  sanitizeFileName,
  identifyUrlType,
  getClientAccessToken,
  fetchMe
};
