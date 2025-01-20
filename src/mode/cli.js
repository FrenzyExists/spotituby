'use strict';

import Url from "../utils/url.js";
import Songs from "../utils/songs.js";
import {
  confirm, checkbox,
  input,
  password,
  select
} from "@inquirer/prompts";
import SpotifyManager from "../utils/spotify.js";

const CLIMode = class {
  constructor(download_path, options) {
    this.download_path = download_path;
    this.options = options;
  }

  /**
   * Maps each song in the array to a new object with properties for display and value.
   * 
   * @param {Array<Songs>} songs - Array of song objects.
   * @throws {Error} If the input is not a non-empty array of objects.
   * 
   * Each song object is expected to have the following properties:
   * 
   * @typedef {Songs} Song
   * @property {string} name - The name of the song.
   * @property {Array<Object>} artists - Array of artist objects with a 'name' property.
   * @property {Object} album - Album object with properties 'name', 'images', 'href', and 'release_date'.
   * @property {number} duration_ms - The duration of the song in milliseconds.
   * @property {Object} external_urls - Object with a 'spotify' property.
   * @property {number} popularity - The popularity of the song.
   * @property {number} disc_number - The disc number of the song.
   * @property {number} track_number - The track number of the song.
   * @property {string} type - The type of the song.
   * @property {boolean} explicit - Whether the song is explicit.
   * @property {Object} external_ids - Object with an 'isrc' property.
   * 
   * The mapped object has two properties:
   * @typedef {Object} MappedSong
   * @property {string} name - The name of the song, visible to the user.
   * @property {Object} value - Object with properties 'name', 'duration_ms', 'artist', 'album', 'image', 'album_url', 'external_url', 'popularity', 'disk_number', 'track_number', 'release_date', 'type', 'explicit', and 'isrc'.
   * 
   * @returns {Array<MappedSong>} Array of mapped song objects.
   */
  listSongs = async (songs) => {
    if (!Array.isArray(songs) || !songs.every(song => typeof song === 'object' && song !== null)) {
      console.error("Invalid input: 'songs' must be a non-empty array of objects.");
      return;
    }

    let selectedTracks = await confirm({
      message: `Found ${songs.length} tracks in this playlist.\nDo you want to download all tracks? This may take a while 🤔`,
      default: false
    }).catch(e => {
      console.log("Option Cancelled. Goodbye 👋");
      process.exit(0);
    }) ? songs.map(s => {
      return {
        name: s.name,
        value: s
      }
    }) : await checkbox({
      message: `🎶 Select your songs 🎶`,
      choices: songs.map(s => {
        return {
          name: s.name,
          value: s
        }
      }),
      validate: ans => ans.length > 0 ? true : "You must select at least one song to download."
    }).catch(e => {
      console.log("Selection Cancelled. Goodbye 👋");
      process.exit(0);
    });
    return selectedTracks;
  }

  downloadSongs = async (songs) => {

  }

  /**
   * Lists and allows the user to select playlists from a given array.
   * 
   * @param {Array<Object>} playlists - Array of playlist objects.
   * @returns {Promise<Array<Object>>} Promise that resolves to an array of selected playlists.
   */
  listPlaylists = async (playlists) => {
    if (!Array.isArray(playlists) || !playlists.every(pl => typeof pl === 'object' && pl !== null)) {
      console.error("Invalid input: 'playlists' must be a non-empty array of objects.");
      return;
    }

    let selectedTracks = await checkbox({
      message: '🎩 Select a playlist 🪄',
      choices: playlists.map(pl => {
        return {
          name: pl.name,
          value: pl,
          description: pl?.description,
          validate: ans => ans.length > 0 ? true : "You must select at least one playlist."
        }
      })
    }).catch(e => {
      console.log("Selection Cancelled. Goodbye 👋");
      process.exit(0);
    });
    return selectedTracks;
  }

  execute = async (url = this.url, download_path = this.download_path) => {
    const mode = Url.identifyUrlType(url);
 
    // Step 1: verify the url
    // |- YT url: 
    // |  |- Download with available YT metadata
    // |  |- Download with spotify metadata, does not require user log in
    // |- SP url
    // |  |- Download public url, no user login required
    // |  |- Download personal playlist, locgin required
    // |- No URL, run wizard
    // Step 2:
    // If Downloading from URL and is a playlist ask if download all playlist or select
    // If Wizard connect to personal account and show playlists. Liked songs is treated as a playlist too.
    // Step 2a: (Wizard or playlist URL) Download all playlist or select which to download
    // Step 2b: (Wizard or playlist URL) Download all songs on playlist or select which
    // Step 3: Download and be done

    // const spot = new SpotifyManager();

  }
  // getAllTracks
};


export default CLIMode;