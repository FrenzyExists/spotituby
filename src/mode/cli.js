'use strict';

import Url from "../utils/url.js";
import Songs from "../utils/songs.js";
import { fetchImage, HOME, readToken, writeMetadata } from '../utils.js'
import {
  confirm, checkbox,
  input,
  password,
  select
} from "@inquirer/prompts";
import SpotifyManager from "../utils/spotify.js";
import Colors from "../utils/colors.js";
import YoutubeManager from "../utils/youtube.js";
import Track from "../track.js";

const CLIMode = class {
  /**
   * 
   * @param {String} url 
   * @param {Object} options 
   * 
   * options
   * - dir
   * - reset
   */
  constructor(url, options) {
    this.options = options;
    this.options.dir = this.options?.dir || `${HOME}/Downloads`;
    this.options.downloadPath = this.options?.downloadPath || this.options.dir;
    this.url = url;
    // console.log(this.options);
    // console.log(this.url);
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

  execute = async (url = this.url, download_path = this.options.downloadPath) => {
    // get modes    
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
    // |- If Downloading from URL and is a playlist ask if download all playlist or select
    // |- If Wizard connect to personal account and show playlists. Liked songs is treated as a playlist too.
    // Step 2a: (Wizard or playlist URL) Download all playlist or select which to download
    // Step 2b: (Wizard or playlist URL) Download all songs on playlist or select which
    // Step 3: Download and be done
    // const token = await readToken();
    const SPmanager = new SpotifyManager();
    const YTmanager = new YoutubeManager();

    // Step 0: Spotify Auth. If not already authenticated, fetch a new token    
    await SPmanager.fetchAuthToken();
    await SPmanager.validateAuthToken();

    // Step 1: verify the url
    switch (mode) {
      case Url.type.YT_TRACK: // YT URL
        // Add logic to handle YouTube track download
        console.log(`Downloading ${Colors.red}YouTube${Colors.clr} track...`);
        const detailsYT = await YTmanager.fetchAudio(url, download_path);
        // console.log(`Found ${Colors.green}${details.track}${Colors.clr} by ${Colors.yellow}${details.artists.join(' & ')}${Colors.clr} released in ${Colors.blue}${details.releaseYear}${Colors.clr}`);
        
        if (detailsYT) {
          console.log(`Downloaded to: ${Colors.green}${detailsYT.filepath}${Colors.clr}`);
          console.log(`File size: ${Colors.blue}${detailsYT.audioCodec}${Colors.clr}`);
          console.log(`Audio quality: ${Colors.yellow}${detailsYT.audioBitrate}${Colors.clr} (${detailsYT.audioCodec})`);
        }
        console.log(detailsYT.artists, 'artists', typeof detailsYT.artists);
        
        // Retrieve Details from Spotify. The reason we want the ones from Spotify and not Youtube is because Spotify has more accurate metadata of a song
        const searchResults = await SPmanager.fetchSongSearch(detailsYT.artists, detailsYT.track, detailsYT.album);
        console.log(searchResults);
        
        if (!searchResults.success) {
          console.log(`No song found matching your search query: ${Colors.red}${detailsYT.track} - ${detailsYT.artists.join(' & ')}${Colors.clr}`);
          return;
        }
        // retrieve the image from Spotify
        console.log("\n\nIMAGES\n\n-----\n", searchResults.tracks[0].album.images[0].url);
        
        const image = await fetchImage(searchResults.tracks[0].album.images[0].url);
        
        // write metadata
        let artists = [];
        searchResults.tracks[0].artists.forEach(artist => {
          artists.push(artist.name);
        });
        await writeMetadata(
            {
              name: searchResults.tracks[0].name,
              artist: artists,
              year: searchResults.tracks[0].album.release_date,
              release_date: searchResults.tracks[0].album.release_date,
              track_number: searchResults.tracks[0].track_number,
              album: searchResults.tracks[0].album.name,
              isrc: searchResults.tracks[0].isrc,
              image: image,
              duration_ms: searchResults.tracks[0].duration_ms,
              explicit: searchResults.tracks[0].explicit
            },
            detailsYT.filepath
        );

        new Track(searchResults.tracks[0]);

        // await SPmanager.fetchSongSearch(`${detailsYT.track} - ${detailsYT.artists.join(' & ')}`);
        break;
      case Url.type.YT_PLAYLIST:
        console.log(`Downloading ${Colors.red}YouTube${Colors.clr} playlist...`);
        // Add logic to handle YouTube playlist download
        break;
      case Url.type.SY_TRACK:
        console.log(`Downloading ${Colors.green}Spotify${Colors.clr} track...`);
        // Add logic to handle Spotify track download
        break;
      case Url.type.SY_PLAYLIST:
        console.log(`Downloading ${Colors.green}Spotify${Colors.clr} playlist...`);
        // Add logic to handle Spotify playlist download
        break;
      default:
        console.log(`Executing ${Colors.yellow}Wizard${Colors.clr}...`);

        // Handle unsupported URL types or no URL
        // This mode triggers the wizard
        // this wizard attempts to connect to the spotify of the user
        // then gets and updates the credentials
        break;
    }



  }
  // getAllTracks
};


export default CLIMode;