/**
 * Represents a track object following Spotify's Web API structure with additional custom fields
 * for local file management and cross-platform compatibility.
 * 
 * @class
 * @see {@link https://developer.spotify.com/documentation/web-api/reference/object-model/#track-object-full|Spotify Track Object}
 * 
 * @example
 * // Create a track from Spotify data
 * const spotifyTrack = new Track({
 *   id: '1234567890',
 *   name: 'Song Name',
 *   artists: [{ name: 'Artist Name' }],
 *   album: { name: 'Album Name' },
 *   duration_ms: 180000
 * });
 * 
 * @example
 * // Create a track from local file
 * const localTrack = new Track({
 *   name: 'Local Song.mp3',
 *   artists: [{ name: 'Local Artist' }],
 *   local_path: '/path/to/song.mp3',
 *   source: 'local',
 *   download_status: 'completed'
 * });
 */
class Track {
  /**
   * Creates a new Track instance. The Track class provides a unified interface for handling
   * music tracks from different sources (Spotify, YouTube, local files) while maintaining
   * compatibility with Spotify's Web API structure.
   * 
   * Required fields will be initialized with default values if not provided.
   * Custom fields extend the base Spotify structure to support local file management
   * and cross-platform features.
   * 
   * @param {Object} trackData - Raw track data object
   * @param {string} [trackData.id] - Unique identifier for the track
   * @param {string} [trackData.name] - Name/title of the track
   * @param {string} [trackData.uri] - Spotify URI or custom URI for the track (e.g., 'spotify:track:1234567890')
   * 
   * @param {Array<Object>} [trackData.artists] - Array of artist objects
   * @param {string} [trackData.artists[].id] - Artist's unique identifier
   * @param {string} trackData.artists[].name - Artist's name (required if artists array is provided)
   * @param {string} [trackData.artists[].uri] - Artist's URI (e.g., 'spotify:artist:1234567890')
   * @param {string} [trackData.artists[].type='artist'] - Type of artist
   * 
   * @param {Object} [trackData.album] - Album information
   * @param {string} [trackData.album.id] - Album's unique identifier
   * @param {string} trackData.album.name - Album name (required if album object is provided)
   * @param {string} [trackData.album.release_date] - Album release date in YYYY-MM-DD format
   * @param {number} [trackData.album.total_tracks] - Total number of tracks in the album
   * @param {string} [trackData.album.type='album'] - Type of album
   * @param {string} [trackData.album.uri] - Album's URI (e.g., 'spotify:album:1234567890')
   * @param {Array<Object>} [trackData.album.images] - Array of album artwork images
   * @param {string} trackData.album.images[].url - URL of the image
   * @param {number} trackData.album.images[].height - Height of the image in pixels
   * @param {number} trackData.album.images[].width - Width of the image in pixels
   * 
   * @param {number} [trackData.duration_ms=0] - Track duration in milliseconds
   * @param {boolean} [trackData.explicit=false] - Whether the track has explicit content
   * @param {number} [trackData.popularity=0] - Track popularity score (0-100)
   * 
   * @param {Object} [trackData.external_urls={}] - External URLs for the track
   * @param {string} [trackData.external_urls.spotify] - Spotify URL
   * @param {string} [trackData.external_urls.youtube] - YouTube URL
   * 
   * @param {Object} [trackData.external_ids={}] - External IDs
   * @param {string} [trackData.external_ids.isrc] - International Standard Recording Code
   * @param {string} [trackData.external_ids.ean] - International Article Number
   * @param {string} [trackData.external_ids.upc] - Universal Product Code
   * 
   * @param {boolean} [trackData.is_playable=true] - Whether the track is playable in user's market
   * @param {string} [trackData.preview_url] - URL for a 30-second preview MP3
   * @param {Array<string>} [trackData.available_markets=[]] - ISO 3166-1 alpha-2 country codes
   * @param {number} [trackData.disc_number=1] - Position of track's disc in album
   * @param {number} [trackData.track_number=1] - Position of track in album/disc
   * @param {boolean} [trackData.is_local=false] - Whether track is from local files
   * 
   * @param {string} [trackData.lyrics] - Track lyrics (custom field)
   * @param {string} [trackData.local_path] - Path to local audio file (custom field)
   * @param {string} [trackData.download_status='pending'] - Download status (custom field)
   * Values: 'pending' | 'downloading' | 'completed' | 'failed'
   * @param {string} [trackData.source='spotify'] - Source of track data (custom field)
   * Values: 'spotify' | 'youtube' | 'local'
   * 
   * @throws {Error} If required artist or album name is missing when their parent objects are provided
   */
  constructor(trackData = {}) {
    // Required fields
    this.id = trackData.id || null;
    this.name = trackData.name || '';
    this.type = 'track';
    this.uri = trackData.uri || null;

    // Artists information
    this.artists = (trackData.artists || []).map(artist => ({
      id: artist.id,
      name: artist.name,
      type: artist.type || 'artist',
      uri: artist.uri
    }));

    // Album information
    this.album = trackData.album ? {
      id: trackData.album.id,
      name: trackData.album.name,
      release_date: trackData.album.release_date,
      total_tracks: trackData.album.total_tracks,
      type: trackData.album.type || 'album',
      uri: trackData.album.uri,
      images: trackData.album.images || []
    } : null;

    // Audio features
    this.duration_ms = trackData.duration_ms || 0;
    this.explicit = trackData.explicit || false;
    this.popularity = trackData.popularity || 0;

    // External URLs and IDs
    this.external_urls = trackData.external_urls || {};
    this.external_ids = trackData.external_ids || {};
    this.href = trackData.href || null;

    // Playback and availability
    this.is_playable = trackData.is_playable || true;
    this.preview_url = trackData.preview_url || null;
    this.available_markets = trackData.available_markets || [];

    // Additional metadata
    this.disc_number = trackData.disc_number || 1;
    this.track_number = trackData.track_number || 1;
    this.is_local = trackData.is_local || false;

    // Custom fields
    this.lyrics = trackData.lyrics;
    this.local_path = trackData.local_path;
    this.download_status = trackData.download_status || 'pending';
    this.source = trackData.source || 'spotify';

    // Validate required fields
    if (trackData.artists && !trackData.artists[0].name) {
      throw new Error('Artist name is required when providing artists array');
    }
    if (trackData.album && !trackData.album.name) {
      throw new Error('Album name is required when providing album object');
    }
  }

  /**
   * Gets the main artist of the track
   * @returns {Object|null} Main artist object
   */
  getMainArtist() {
    return this.artists[0] || null;
  }

  /**
   * Gets all artist names joined in a readable format
   * @param {string} [separator=' & '] - Separator to use between artist names
   * @returns {string} Joined artist names
   */
  getArtistNames(separator = ' & ') {
    return this.artists.map(artist => artist.name).join(separator);
  }

  /**
   * Gets the album cover URL of a specific size
   * @param {string} [size='medium'] - Size of image (small, medium, large)
   * @returns {string|null} URL of the album cover
   */
  getAlbumCover(size = 'medium') {
    if (!this.album || !this.album.images || this.album.images.length === 0) {
      return null;
    }

    const sizes = {
      small: 0,    // 64x64
      medium: 1,   // 300x300
      large: 2     // 640x640
    };

    return this.album.images[sizes[size]]?.url || this.album.images[0].url;
  }

  /**
   * Gets the duration in a human readable format
   * @returns {string} Duration in MM:SS format
   */
  getDuration() {
    const minutes = Math.floor(this.duration_ms / 60000);
    const seconds = ((this.duration_ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds.padStart(2, '0')}`;
  }

  /**
   * Creates a Track instance from Spotify track data
   * @param {Object} data - Spotify track data
   * @returns {Track} New Track instance
   */
  static fromSpotify(data) {
    return new Track(data);
  }

  /**
   * Creates a Track instance from YouTube video data
   * @param {Object} data - YouTube video data
   * @returns {Track} New Track instance
   */
  static fromYouTube(data) {
    // Convert YouTube data format to our track format
    const trackData = {
      id: data.id,
      name: data.title,
      uri: `youtube:track:${data.id}`,
      artists: [{
        id: data.channelId,
        name: data.author,
        type: 'artist',
        uri: `youtube:channel:${data.channelId}`
      }],
      duration_ms: data.duration * 1000, // Convert seconds to milliseconds
      external_urls: {
        youtube: `https://www.youtube.com/watch?v=${data.id}`
      },
      preview_url: null,
      is_local: false
    };

    return new Track(trackData);
  }

  /**
   * Converts the track to a plain object
   * @returns {Object} Plain object representation of the track
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      uri: this.uri,
      artists: this.artists,
      album: this.album,
      duration_ms: this.duration_ms,
      explicit: this.explicit,
      popularity: this.popularity,
      external_urls: this.external_urls,
      external_ids: this.external_ids,
      href: this.href,
      is_playable: this.is_playable,
      preview_url: this.preview_url,
      available_markets: this.available_markets,
      disc_number: this.disc_number,
      track_number: this.track_number,
      is_local: this.is_local,
      lyrics: this.lyrics,
      local_path: this.local_path,
      download_status: this.download_status,
      source: this.source
    };
  }
}

export default Track;