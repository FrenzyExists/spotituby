import fs from 'fs';
import { sanitizeFileName } from './url.js';
import path from 'path';
import NodeID3 from 'node-id3';

const Playlists = class {
  constructor(url = null, download_path = null) {
    this.download_path = download_path;
    this.url = url;

  }

  writeM3UPlaylist = (tracks, playlistInfo, filepath = this.download_path) => {
    if (!Array.isArray(tracks) || tracks.length === 0) {
      console.log("No tracks available");
      return;
    }

    const playlistContent = ['#EXTM3U', "EXT-X-VERSION:3", ""];
    const sanitizedPlaylistName = sanitizeFileName(playlistInfo.name);
    const playlistPath = path.join(filepath, `${sanitizedPlaylistName}.m3u8`);

    tracks.forEach(track => {
      const trackMetadata = NodeID3.read(path.join(filepath, track));

      const { title, artist, length, album } = trackMetadata;
      let artists = artist;
      artists = artists ? artists.replace(/, /g, ' & ') : '';
      // Add extended info
      playlistContent.push(`#EXTINF:${length},${artists} - ${title}`)
      playlistContent.push(`#EXT-X-ARTIST:${artists}`)
      playlistContent.push(`#EXT-X-ALBUM:${album}`)
      playlistContent.push(`#EXT-X-FILENAME:${track}`)
      playlistContent.push("")
    });

    try {
      fs.writeFileSync(playlistPath, playlistContent.join('\n'), 'utf8');
      console.log(`✨ Playlist created: 📂 ${playlistPath}`);
    } catch (error) {
      console.error('❌ Error creating playlist file:', error);
    }
  }

  downloadYTSong = async (url = this.url, download_path = this.download_path) => {

  }

  downloadSPSong = async (url = this.url, download_path = this.download_path) => {

  }

  downloadYTPlaylist = async (url = this.url, download_path = this.download_path, playlist = null,) => {

  }

  downloadSPPlaylist = async (url = this.url, download_path = this.download_path, playlist = null,) => {

  }

  download = async (url = this.url, download_path = this.download_path, playlist = null) => {
    const mode = Url.identifyUrlType(url);

    // Mapping of URL types to their respective download functions
    const downloadFunctions = {
      [Url.type.YT_TRACK]: downloadYTSong,
      [Url.type.YT_PLAYLIST]: downloadYTPlaylist,
      [Url.type.SY_TRACK]: downloadSPSong,
      [Url.type.SY_PLAYLIST]: downloadSPPlaylist,
    };

    // Check if the URL type has a corresponding download function
    const downloadFunction = downloadFunctions[mode];

    if (downloadFunction) {
      return downloadFunction(url, download_path); // Call the appropriate download function
    } else {
      throw new Error("Unsupported URL type for download.");
    }
  }

  createM3U8
}

export default Playlists;