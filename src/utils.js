'use strict';

import axios from "axios";
import os from "os";
import { fileURLToPath } from 'url';
import {
  dirname,
  resolve
} from "path";


const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_PORT = 3000;
const HOME = os.homedir();
const TOKENFILE = ".token";
const SERVER_PATH = resolve(__dirname, 'server', "index.js");
const LOCAL_PLAYLISTS_DIR = path.resolve(__dirname, '../', 'playlists');
const PUBLIC_PLAYLISTS_FILE = path.resolve(__dirname, '../', 'public_playlists.json');

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

export {
  __dirname,
  HOME,
  SERVER_PORT,
  SERVER_PATH,
  TOKENFILE,
  LOCAL_PLAYLISTS_DIR,
  PUBLIC_PLAYLISTS_FILE,
  fetchImage
};