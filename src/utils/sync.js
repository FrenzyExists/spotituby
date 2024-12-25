import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { fetchPlaylists, fetchPlaylistTracks, getAuthToken, navigateSpotifyTracks } from './index.js';
import { writeM3UPlaylist } from './playlist.js';
import {refreshAccessToken} from './index.js'


let token = null;
const localPlaylists = new Map();
const spotifyPlaylists = new Map();


/**
 * Scans local playlists in the specified directory.
 * 
 * @param {string} watchDir - The directory to scan for playlists.
 */
//TODO: Change this to match the format from fetchPlaylist for sync
const scanLocalPlaylists = async (watchDir) => {
  console.log("Checking Local playlists...");
  const files = fs.readdirSync(watchDir);
  localPlaylists.clear();

  let m = []
  let playlists = []

  for (const file of files) {
    if (path.extname(file) === '.mp3') {
      m.push(file)
    }
    if (path.extname(file) === '.mp3u8' || path.extname(file) === '.xml') {
      playlists.push(file)
    }
  }
  writeM3UPlaylist(
    m,
    watchDir,
    {
      name: "Liked Songs",
      description: "My Favorite Songs :D"
    }
  );
  return playlists;
};

/**
 * Compares and synchronizes playlists between local and Spotify.
 * 
 * @param {Array} localPlaylists - Array of local playlists.
 * @param {Array} spotifyPlaylists - Array of Spotify playlists.
 * @param {string} accessToken - The access token for Spotify API authentication.
 */
const performSync = async (localPlaylists, spotifyPlaylists, accessToken) => {
  console.log("Sorry, Still haven't figured out this one yet");
}


/**
 * Synchronizes playlists between local and Spotify.
 * 
 * @param {string} watchDir - The directory to watch for playlist files.
 */
const syncPlaylists = async (watchDir) => {
  try {
    // Fetch local playlists
    const localPlaylists = await scanLocalPlaylists(watchDir);

    // Fetch Spotify playlists
    const accessToken = await getAuthToken();
    const spotifyPlaylists = await fetchPlaylists(accessToken);

    // Compare and sync
    await performSync(localPlaylists, spotifyPlaylists, accessToken);

    console.log('✅ Sync completed successfully');
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
};


export const startPlaylistSync = async (watchDir, interval) => {
  try {
    // token = await getAuthToken();
    console.log('🎵 Playlist synchronization started');

    // Initial sync
    await syncPlaylists(watchDir);

    // Set up file system watcher
    //   setupWatcher(watchDir);

    // Set up periodic sync
    //   setInterval(() => syncPlaylists(watchDir), interval * 60 * 1000);
  } catch (error) {
    console.error('Failed to start sync:', error);
  }
};
