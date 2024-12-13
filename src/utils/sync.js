import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';


// const dirWatcher = () => {
//     // Initialize the watcher
//   const watcher = chokidar.watch('path/to/directory', {
//     persistent: true,
//     ignored: /node_modules/, // Ignore node_modules directory
//   });
//   }



/**
 * Stops the watcher.
 *
 * This function closes the watcher object from the chokidar library,
 * effectively stopping the file system watching process.
 *
 * @param {chokidar.FSWatcher} watcher - The watcher object to be stopped.
 * @returns {void}
 */
const watcherStop = async (watcher) => {
    if (watcher) {
        watcher.close()
    }
    console.log("❌ Playlist Sync Ended");
}

const watcherStart = async (token  ) => {
    try {

    } catch (error) {

    }
}

const watcherSetup = async (watchDir) => {
    watcher = chokidar.watch(watchDir, {
        ignored: /(^|[\/\\])\../,
        persistent: true
    })

    watcher
        .on('add', path => this.handleFileChange('add', path))
        .on('unlink', path => this.handleFileChange('remove', path))
        .on('change', path => this.handleFileChange('change', path));

    return watcher
}

export default {
    watcherStart,
    watcherStop,
    watcherSetup
}