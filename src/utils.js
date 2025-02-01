'use strict';

import axios from "axios";
import os from "os";
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
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
  executeCommand
};