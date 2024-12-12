import fs from 'fs';
import path from 'path';
import { sanitizeFileName } from './index.js';

const writeM3UPlaylist = (tracks, filepath, playlistInfo) => {
    if (!Array.isArray(tracks) || tracks.length === 0) {
        console.log("No tracks available");
        return;
    }

    const playlistContent = ['#EXTM3U'];
    const sanitizedPlaylistName = sanitizeFileName(playlistInfo.name);
    const playlistPath = path.join(filepath, `${sanitizedPlaylistName}.m3u8`);

    tracks.forEach(track => {
        const duration = Math.round(track.duration_ms / 1000);
        const artist = Array.isArray(track.artist) ? track.artist.join(', ') : track.artist;
        const fileName = `${sanitizeFileName(track.name)}.mp3`;

        // Add extended info
        playlistContent.push(`#EXTINF:${duration},${artist} - ${track.name}`);
        // Add file path (relative to playlist location)
        playlistContent.push(fileName);
    });

    try {
        fs.writeFileSync(playlistPath, playlistContent.join('\n'), 'utf8');
        console.log(`✨ Playlist created: 📂 ${playlistPath}`);
    } catch (error) {
        console.error('❌ Error creating playlist file:', error);
    }

}

const writeTSVPlaylist = (tracks, filepath, filename) => {
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

export default {
    writeTSVPlaylist,
    writeM3UPlaylist
}