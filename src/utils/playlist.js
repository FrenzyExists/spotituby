import fs from 'fs';
import path from 'path';
import { sanitizeFileName } from './index.js';
import NodeID3 from 'node-id3';


export const writeM3UPlaylist = (tracks, filepath, playlistInfo) => {
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

export const writeTSVPlaylist = (tracks, filepath, filename) => {
  if (!Array.isArray(tracks) || tracks.length === 0) {
    console.log("No tracks available");
    return;
  }

  const headers = Object.keys(tracks[0]);

  const tsvContent = [
    headers.join('\t'), // Header row
    ...tracks.map(track =>
      headers.map(header => track[header] || '').join('\t') // Data rows
    )
  ].join('\n');

  const full_pathname = `${filepath}/${filepath}`
  try {
    fs.writeFileSync(full_pathname, tsvContent, 'utf-8');
    console.log(`✨ TSV Playlist created: 📂 ${filename}`);
  } catch (error) {
    console.error('❌ Error writing TSV playlist:', error.message);
  }
}

