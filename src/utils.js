'use strict';

import axios from "axios";
import os from "os";
import { fileURLToPath } from 'url';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import NodeID3 from "node-id3";
import {
  dirname,
  resolve
} from "path";
import { exec } from "child_process";


const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_PORT = 3000;
const HOME = os.homedir();
const TOKENFILE = ".token";
const SERVER_PATH = resolve(__dirname, 'server', "index.js");
const LOCAL_PLAYLISTS_DIR = resolve(__dirname, '../', 'playlists');
const PUBLIC_PLAYLISTS_FILE = resolve(__dirname, '../', 'public_playlists.json');
const GENIUS_API_BASE_URL = 'https://api.genius.com';

const fetchImage = async imageUrl => {
  try {
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer"
    });
    // Return the buffer and MIME type
    return Buffer.from(response.data);
  } catch (e) {
    console.error("Error fetching image:", e.message);
    throw new Error("Failed to fetch image");
  }
};

const readToken = async (file = TOKENFILE) => {
  try {
    const fileContents = readFileSync(file, "utf-8");
    const { accessToken, refreshToken, expiresAt } = JSON.parse(fileContents);
    if (!accessToken || !refreshToken || !expiresAt) {
      throw new Error("Token file is missing required properties: accessToken, refreshToken, or expiresAt.");
    }
    return { accessToken, refreshToken, expiresAt };
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error("Token file contains invalid JSON.");
    } else if (e.code === 'ENOENT') {
      throw new Error(`Token file not found at path: ${file}`);
    } else {
      throw new Error("An error occurred while reading the token file.", e);
    }
  }
}


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
 * @private
 */
const writeMetadata = async (info, filepath) => {

  console.log("Received artists", info.artist)
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
    APIC: info.image,
    comment: info.explicit ? "Explicit content" : "Clean content", // COMM
    originalTitle: info.name // TOAL
  };

  let f = filepath.replace(/\.[^/.]+$/, ".mp3");

  NodeID3.update(tags, f, (e, buff) => { });
};


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

export {
  __dirname,
  HOME,
  SERVER_PORT,
  SERVER_PATH,
  TOKENFILE,
  LOCAL_PLAYLISTS_DIR,
  PUBLIC_PLAYLISTS_FILE,
  GENIUS_API_BASE_URL,
  fetchImage,
  readToken,
  executeCommand,
  writeMetadata
};