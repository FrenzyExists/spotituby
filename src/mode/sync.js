import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { Command } from 'commander';
import cliProgress from 'cli-progress';
import { LOCAL_PLAYLISTS_DIR, PUBLIC_PLAYLISTS_FILE } from '../utils.js';

const SyncMode = class {
  constructor(sync_directory, options) {
    this.sync_directory = sync_directory;
    this.options = options;
  }

  syncLocalPlaylists = async () => {

  }

  verifyDirectories = () => {
    // Ensure directories exist
    if (!fs.existsSync(LOCAL_PLAYLISTS_DIR)) fs.mkdirSync(LOCAL_PLAYLISTS_DIR, { recursive: true });
    if (!fs.existsSync(this.sync_directory)) fs.mkdirSync(this.sync_directory, { recursive: true });
  }

  syncRemotePlaylists = async () => {

  }

  startDaemon = async (sync_interval = 15) => {
    let si = sync_interval * 60 * 1000; // minutes * seconds in a minute * miliseconds in a single second

    const watcher = chokidar.watch([LOCAL_PLAYLISTS_DIR, PUBLIC_PLAYLISTS_FILE], {
      persistent: true,
      ignoreInitial: true,
    });

    watcher.on('all', async (event, path) => {
      console.log(`Detected change (${event}) in ${path}. Synchronizing...`);
      // await this.syncLocalPlaylists();
      // await this.syncRemotePlaylists();
    });

    setInterval(async () => {
      // await this.syncLocalPlaylists();
      // await this.syncRemotePlaylists();
    }, sync_interval);

  }

}

export default SyncMode;