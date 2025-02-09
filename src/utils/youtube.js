import { executeCommand } from "../utils.js";
import { existsSync, accessSync, constants } from 'fs';
import { resolve } from 'path';

// Constants for video filtering and quality
const VIDEO_FILTERS = {
  MUSIC_VIDEO: '--reject-title "official video|music video|official music video"',
  AUDIO_ONLY: '--match-title "audio|lyrics|slowed|reverb|extended|instrumental"',
  LIVE: '--reject-title "live|concert|performance|tour|show"'
};

const QUALITY_FILTERS = {
  BEST_AUDIO: '-f bestaudio',
  HIGH_QUALITY: '-f "bestaudio[acodec=opus]/bestaudio"',
  COMPRESSED: '-f "worstaudio[acodec=opus]/worstaudio"'
};

/**
 * Manages YouTube audio downloads and metadata extraction using yt-dlp
 */
class YoutubeManager {
  constructor(options = {}) {
    this.options = {
      preferAudioOnly: true,  // Prefer videos that are just audio/lyrics
      rejectMusicVideos: true,  // Reject official music videos
      rejectLive: true,  // Reject live performances
      audioQuality: 'HIGH_QUALITY',
      ...options
    };
  }

  /**
   * Builds a filter query based on current options
   * @private
   * @returns {string} Combined filter query
   */
  _buildFilterQuery() {
    const filters = [];
    if (this.options.rejectMusicVideos) {
      filters.push(VIDEO_FILTERS.MUSIC_VIDEO);
    }
    if (this.options.preferAudioOnly) {
      filters.push(VIDEO_FILTERS.AUDIO_ONLY);
    }
    if (this.options.rejectLive) {
      filters.push(VIDEO_FILTERS.LIVE);
    }
    return filters.join(' ');
  }

  /**
   * Validates if a URL is a YouTube URL and determines its type
   * @param {string} url - URL to validate
   * @returns {Object} Object containing validation result and URL type
   * @property {boolean} valid - Whether URL is valid
   * @property {string} type - URL type (video, playlist, channel)
   * @property {string} id - Video/Playlist/Channel ID
   */
  validateUrl(url) {
    const videoRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const playlistRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:playlist|p)\/|.*[?&]list=))([^"&?\/\s]{34})/;
    const channelRegex = /(?:youtube\.com\/(?:c\/|channel\/|user\/))([^"&?\/\s]+)/;

    let match;
    if ((match = url.match(videoRegex))) {
      return { valid: true, type: 'video', id: match[1] };
    } else if ((match = url.match(playlistRegex))) {
      return { valid: true, type: 'playlist', id: match[1] };
    } else if ((match = url.match(channelRegex))) {
      return { valid: true, type: 'channel', id: match[1] };
    }
    return { valid: false, type: null, id: null };
  }

  /**
   * Fetches playlist information and its videos
   * @param {string} url - Playlist URL
   * @returns {Promise<Object>} Playlist information and videos
   */
  async fetchPlaylistInfo(url) {
    try {
      const { valid, type } = this.validateUrl(url);
      if (!valid || type !== 'playlist') {
        throw new Error('Invalid playlist URL');
      }

      const INFO_COMMAND = `yt-dlp --flat-playlist --print "%(title)s|||%(uploader)s|||%(playlist_count)s|||%(playlist_title)s" "${url}"`;
      const info = await executeCommand(INFO_COMMAND);
      const [title, uploader, count, playlistTitle] = info.split('|||');

      return {
        title: playlistTitle,
        uploader,
        videoCount: parseInt(count),
        url
      };
    } catch (error) {
      console.error('Error fetching playlist info:', error.message);
      throw error;
    }
  }

  /**
   * Fetches a YouTube URL based on song metadata or direct URL
   * @param {Object} options - Options for fetching song URL
   * @param {string} [options.url=null] - Direct YouTube URL
   * @param {Object} [options.query=null] - Query object for searching
   * @param {string} options.query.artist - Artist name for search
   * @param {string} options.query.name - Song name for search
   * @param {number} [options.resultsCount=5] - Number of results to fetch
   * @returns {Promise<string|null>} YouTube URL if found, null otherwise
   * @throws {Error} If no URL or query provided, or no results found
   */
  async fetchSongUrl({
    url = null,
    query = null,
    resultsCount = 5,
  }) {
    try {
      if (!url && query) {
        const filterQuery = this._buildFilterQuery();
        const SEARCH_QUERY = `ytsearch${resultsCount}:\"${query.artist} - ${query.name}\"`;
        const SEARCH_COMMAND = `yt-dlp ${SEARCH_QUERY} ${filterQuery} --print \"%(webpage_url)s\" 2>/dev/null | head -n 1`;

        url = await executeCommand(SEARCH_COMMAND);
        if (!url) {
          throw new Error("No results found for the given metadata.");
        }
      }
      if (!url) {
        throw new Error("No URL or query provided.");
      }
      
      // Validate URL
      const { valid, type } = this.validateUrl(url);
      if (!valid || type !== 'video') {
        throw new Error('Invalid YouTube video URL');
      }

      return url;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  /**
   * Downloads and extracts audio from a YouTube URL with the highest quality available
   * @param {string} url - YouTube URL to download from
   * @param {string} [outputDir=null] - Output directory for downloaded file
   * @returns {Promise<Object>} Object containing download details and metadata
   * @property {string} filepath - Path to the downloaded file
   * @property {string} filesize - Size of the downloaded file
   * @property {string} audioCodec - Audio codec used
   * @property {string} audioBitrate - Audio bitrate
   * @property {string} audioChannels - Number of audio channels
   * @property {string[]} artists - Array of artist names
   * @property {string} track - Track name
   * @property {string} releaseYear - Year of release
   * @property {string} likeCount - Number of likes
   * @property {string} title - Video title
   * @property {string} album - Album name
   * @throws {Error} If directory doesn't exist, isn't writable, or download fails
   */
  async fetchAudio(url, outputDir = null) {
    try {
      // Validate output directory if specified
      if (outputDir) {
        const absolutePath = resolve(outputDir);
        
        if (!existsSync(absolutePath)) {
          throw new Error(`Output directory does not exist: ${absolutePath}`);
        }
        
        try {
          accessSync(absolutePath, constants.W_OK);
        } catch (err) {
          throw new Error(`Output directory is not writable: ${absolutePath}`);
        }
      }

      // Download the audio
      let DOWNLOAD_COMMAND = `yt-dlp ${url} ${QUALITY_FILTERS[this.options.audioQuality]} --extract-audio --audio-format mp3`;
      
      if (outputDir) {
        DOWNLOAD_COMMAND += ` -P "${outputDir}"`;
      }
      
      // Add output template to make the filename more organized
      DOWNLOAD_COMMAND += ` -o "%(title)s.%(ext)s"`;
      
      console.log("Downloading audio...");
      await executeCommand(DOWNLOAD_COMMAND);
      
      // Get file information after download
      const FILE_INFO_COMMAND = `yt-dlp ${url} --print "%(filesize_approx)s|||%(acodec)s|||%(abr)s|||%(audio_channels)s|||%(artists)s|||%(track)s|||%(release_year)s|||%(like_count)s|||%(title)s|||%(album)s" 2>/dev/null`;
      const fileInfo = await executeCommand(FILE_INFO_COMMAND);
      
      if (!fileInfo) {
        throw new Error("Failed to get file information after download");
      }
      console.log(fileInfo, 'info');
      
      let [filesize, audioCodec, audioBitrate, audioChannels, artists, track, releaseYear, likeCount, title, album] = fileInfo.split("|||");
      
      // Convert artists string to proper array
      artists = artists.replace(/'/g, '"').replace(/\[|\]/g, '').trim();
      const regex = /"(.*?)"/g;
      const regexRemoveQuotes = /"(.*?)"$/g;
      const matches = artists.match(regex);
      artists = matches ? matches.map(item => item.replace(regexRemoveQuotes, '$1')) : [artists];
      
      return {
        filepath: outputDir+`/${title}.mp3`,
        filesize,
        audioCodec,
        audioBitrate,
        audioChannels,
        artists,
        track,
        releaseYear,
        likeCount,
        title,
        album
      };
    } catch (error) {
      console.error('Error in fetchAudio:', error.message);
      throw error;
    }
  }

  /**
   * Fetches detailed information about a song from YouTube
   * @param {string} url - YouTube URL to fetch details from
   * @param {boolean} [download=false] - Whether to download the audio file
   * @param {string} [outputDir=null] - Output directory if downloading
   * @returns {Promise<Object>} Object containing song details
   * @property {string} track - Track name
   * @property {string[]} artists - Array of artist names
   * @property {string} releaseYear - Year of release
   * @property {string} album - Album name
   * @property {string} thumbnail - URL to song thumbnail
   * @property {Object} [audioDetails] - Additional audio details if download=true
   * @throws {Error} If unable to fetch song details or download fails
   */
  async fetchSongDetails(url, download = false, outputDir = null) {
    try {
      // First, get song information
      const INFO_COMMAND = `yt-dlp ${url} --print \"%(track)s|||%(artists)s|||%(release_year)s|||%(album)s|||%(thumbnail)s\" 2>/dev/null`;
      let info = await executeCommand(INFO_COMMAND);
      
      if (!info) {
        throw new Error("Failed to execute yt-dlp command");
      }
      
      info = info.split("|||");
      if (info[0] === 'NA' && info[1] === 'NA' && info[2] === 'NA') {
        throw new Error("Failed to fetch song details.");
      }

      info[1] = info[1].replace(/'/g, '"').replace(/\[|\]/g, '');
      const regex = /"(.*?)"/g;
      const regexRemoveQuotes = /"(.*?)"$/g;
      info[1] = info[1].match(regex);
      info[1] = info[1].map(item => item.replace(regexRemoveQuotes, '$1'));

      const result = {
        track: info[0],
        artists: info[1],
        releaseYear: info[2],
        album: info[3],
        thumbnail: info[4]
      };

      // If download is requested, fetch the audio
      if (download) {
        const audioDetails = await this.fetchAudio(url, outputDir);
        Object.assign(result, audioDetails);
      }

      return result;
    } catch (error) {
      console.error('Error in fetchSongDetails:', error.message);
      throw error;
    }
  }

  /**
   * Downloads all videos from a playlist
   * @param {string} url - Playlist URL
   * @param {string} outputDir - Output directory
   * @param {Object} [options] - Download options
   * @param {boolean} [options.parallel=true] - Download in parallel
   * @param {number} [options.maxParallel=3] - Maximum parallel downloads
   * @returns {Promise<Array>} Array of downloaded file information
   */
  async downloadPlaylist(url, outputDir, options = {}) {
    const { parallel = true, maxParallel = 3 } = options;
    
    try {
      const { valid, type } = this.validateUrl(url);
      if (!valid || type !== 'playlist') {
        throw new Error('Invalid playlist URL');
      }

      // Get playlist info first
      const playlistInfo = await this.fetchPlaylistInfo(url);
      console.log(`Downloading playlist: ${playlistInfo.title} (${playlistInfo.videoCount} videos)`);

      // Get all video URLs
      const URLS_COMMAND = `yt-dlp --flat-playlist --get-id "${url}"`;
      const videoIds = (await executeCommand(URLS_COMMAND)).split('\n').filter(Boolean);

      const results = [];
      if (parallel) {
        // Process in batches for parallel downloads
        for (let i = 0; i < videoIds.length; i += maxParallel) {
          const batch = videoIds.slice(i, i + maxParallel);
          const promises = batch.map(id => 
            this.fetchAudio(`https://youtube.com/watch?v=${id}`, outputDir)
              .catch(error => ({ error, videoId: id }))
          );
          const batchResults = await Promise.all(promises);
          results.push(...batchResults);
        }
      } else {
        // Sequential downloads
        for (const id of videoIds) {
          try {
            const result = await this.fetchAudio(`https://youtube.com/watch?v=${id}`, outputDir);
            results.push(result);
          } catch (error) {
            results.push({ error, videoId: id });
          }
        }
      }

      return {
        playlist: playlistInfo,
        downloads: results
      };
    } catch (error) {
      console.error('Error downloading playlist:', error.message);
      throw error;
    }
  }

  /**
   * Extracts best quality audio stream URL without downloading
   * @param {string} url - YouTube URL
   * @returns {Promise<string>} Direct audio stream URL
   */
  async getAudioStreamUrl(url) {
    try {
      const { valid, type } = this.validateUrl(url);
      if (!valid || type !== 'video') {
        throw new Error('Invalid YouTube video URL');
      }

      const STREAM_COMMAND = `yt-dlp -f bestaudio -g "${url}"`;
      const streamUrl = await executeCommand(STREAM_COMMAND);
      if (!streamUrl) {
        throw new Error('Failed to get audio stream URL');
      }

      return streamUrl.trim();
    } catch (error) {
      console.error('Error getting audio stream:', error.message);
      throw error;
    }
  }

  /**
   * Gets available audio formats for a video
   * @param {string} url - YouTube URL
   * @returns {Promise<Array>} Array of available audio formats
   */
  async getAvailableFormats(url) {
    try {
      const { valid, type } = this.validateUrl(url);
      if (!valid || type !== 'video') {
        throw new Error('Invalid YouTube video URL');
      }

      const FORMAT_COMMAND = `yt-dlp -F "${url}" | grep "audio only"`;
      const formats = await executeCommand(FORMAT_COMMAND);
      
      return formats.split('\n')
        .filter(Boolean)
        .map(line => {
          const [formatId, ext, resolution, ...rest] = line.split(/\s+/);
          return {
            formatId,
            extension: ext,
            resolution,
            details: rest.join(' ')
          };
        });
    } catch (error) {
      console.error('Error getting formats:', error.message);
      throw error;
    }
  }
}

export default YoutubeManager;