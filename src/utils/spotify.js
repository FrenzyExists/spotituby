import { readFileSync, existsSync, writeFileSync } from 'fs';
import { GENIUS_API_BASE_URL, TOKENFILE } from '../utils.js';
import { client_id, secret, redirectUri, scope } from "./dotenv.js";
import axios from 'axios';
import querystring from 'querystring';

/**
 * Manages Spotify API interactions including authentication, playlist management, and song searches
 */
class SpotifyManager {
  /**
   * Creates a new SpotifyManager instance
   * @param {Object} [token=null] - Authentication token object
   * @param {string} [token.accessToken] - Spotify access token
   * @param {string} [token.refreshToken] - Refresh token for getting new access tokens
   * @param {number} [token.expiresAt] - Token expiration timestamp
   * @param {string} [email=null] - Spotify account email for login
   * @param {string} [password=null] - Spotify account password for login
   */
  constructor(token = null, email = null, password = null) {
    this.accessToken = null;
    this.token = token;
    this.email = email;
    this.password = password;
  }

  /**
   * Fetches user's playlists from Spotify
   * @param {number} [page_size=-1] - Number of playlists to fetch (-1 for all)
   * @param {boolean} [include_liked_songs=true] - Whether to include liked songs as a playlist
   * @returns {Promise<Array>} Array of playlist objects
   * @throws {Error} If unable to fetch playlists or authentication fails
   */
  fetchUserPlaylists = async (page_size = -1, include_liked_songs = true) => {
    let playlists = [];
    let nextUrl = `https://api.spotify.com/v1/me/playlists?limit=${page_size === -1 ? 50 : page_size}`;
    try {
      const user = await this.fetchUser(accessToken);
    } catch (error) {
      accessToken = await this.fetchAuthToken();
    }

    while (nextUrl) {
      const response = await axios.get(nextUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      playlists = playlists.concat(response.data.items);
      nextUrl = page_size === -1 ? response.data.next : null;
      if (include_liked_songs) {
        // TODO: Finish thig thing
      }
    }

    playlists = playlists.filter(playlist => playlist !== null);
    return playlists;
  }

  /**
   * Fetches user's liked tracks from Spotify
   * @param {number} [page_size=-1] - Number of tracks to fetch (-1 for all)
   * @param {Object} [token=null] - Optional token object for authentication
   * @returns {Promise<Array>} Array of track objects
   * @throws {Error} If unable to fetch tracks or authentication fails
   */
  fetchLikedTracks = async (page_size = -1, token = null) => {
    let totalTracks = [];
    let max_page_size = 50;
    let offset = 0;

    try {
      const t = this._token_get(token);
      const { accessToken } = t;
      while (true) {
        const limit = page_size === -1 ? max_page_size : Math.min(max_page_size, page_size - offset);
        const response = await axios.get("https://api.spotify.com/v1/me/tracks", {
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          params: {
            limit,
            offset
          }
        });
        totalTracks = totalTracks.concat(response.data.items);
        offset += limit;

        // If there are no more tracks or we've fetched the required number, break
        if (!response.data.next || (page_size !== -1 && offset >= page_size)) {
          break;
        }
      }
      return totalTracks;
    } catch (e) {
      console.error("Error fetching playlist tracks:", e.message);
      throw e;
    }
  }

  /**
   * Clears the stored authentication token
   * @returns {Promise<void>}
   */
  clearAuthToken = async () => {
    // TODO: Implement token clearing
  }

  /**
   * Fetches tracks from a specific playlist
   * @param {string} playerlist_id - Spotify playlist ID
   * @param {Object} [token=null] - Optional token object for authentication
   * @param {number} [page_size=-1] - Number of tracks to fetch (-1 for all)
   * @returns {Promise<Array>} Array of track objects
   * @throws {Error} If unable to fetch tracks or authentication fails
   */
  fetchPlayerlistTracks = async (playerlist_id, token = null, page_size = -1) => {
    let totalTracks = [];
    let max_page_size = 50;
    let offset = 0;
    try {
      const t = this._token_get(token);
      const { accessToken } = t;
      while (true) {
        const limit = page_size === -1 ? max_page_size : Math.min(max_page_size, page_size - offset);
        const response = await axios.get(
          `https://api.spotify.com/v1/playlists/${playerlist_id}/tracks`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            },
            params: {
              limit,
              offset
            }
          }
        );
        totalTracks = totalTracks.concat(response.data.items);
        offset += limit;

        // If there are no more tracks or we've fetched the required number, break
        if (!response.data.next || (page_size !== -1 && offset >= page_size)) {
          break;
        }
      }
      return totalTracks;
    } catch (e) {
      console.error("Error fetching playlist tracks:", e.message);
      throw e;
    }
  }

  /**
   * Fetches current user's profile
   * @returns {Promise<Object>} User profile object
   */
  fetchUser = async () => {
    // TODO: Implement user fetching
  }

  /**
   * Fetches a specific song by ID
   * @returns {Promise<Object>} Song details
   */
  fetchSong = async () => {
    // TODO: Implement song fetching
  }

  /**
   * Fetches album details
   * @returns {Promise<Object>} Album details
   */
  fetchAlbum = async () => {
    // TODO: Implement album fetching
  }

  /**
   * Validates and optionally refreshes the authentication token
   * @param {Object} [token=null] - Token object to validate
   * @param {boolean} [auto_update_file=true] - Whether to update token file on refresh
   * @param {boolean} [auto_update_self=true] - Whether to update instance token on refresh
   * @returns {Promise<string>} Valid access token
   * @throws {Error} If token is invalid or refresh fails
   */
  validateAuthToken = async (token = null, auto_update_file = true, auto_update_self = true) => {
    try {
      const t = this._token_get(token);
      const { accessToken, refreshToken, expiresAt } = t;

      // Validate required fields
      if (!accessToken || !refreshToken || !expiresAt) {
        throw new Error("Invalid token data format");
      }
      const bufferTime = 60 * 1000; // 60 seconds in milliseconds
      const currentTime = Date.now();

      // Check if the token is still valid
      if (currentTime + bufferTime < expiresAt) {
        console.debug("Token is valid, returning access token.");
        return accessToken;
      }

      // Token is expired or about to expire, refresh it
      console.log("Token is expired. Attempting to refreshing expired token...");
      const newTokenData = await this.refreshAuthToken(refreshToken);

      // Optionally update the instance token if autoUpdate is enabled
      if (auto_update_self) {
        this.token = newTokenData;
      }
      if (auto_update_file) {
        try {
          writeFileSync(TOKENFILE, JSON.stringify(newTokenData));
        } catch (fileError) {
          console.warn("Failed to write token data to file:", fileError.message);
        }
      }

      console.debug("Token refreshed successfully.");
      return newTokenData.accessToken;
    } catch (e) {
      console.error("Error in validateAuthToken:", e.message);
      throw e;
    }
  }

  /**
   * Gets a valid token object
   * @private
   * @param {Object} [token] - Token object to use, falls back to instance token
   * @returns {Object} Valid token object
   * @throws {Error} If no valid token is available
   */
  _token_get = (token) => {
    const t = token || this.token;
    if (!t) {
      throw new Error("No token provided or available in the instance.");
    }
    return t;
  }

  /**
   * Fetches details for a specific track
   * @param {string} trackId - Spotify track ID
   * @param {Object} [token=null] - Optional token object for authentication
   * @returns {Promise<Object>} Track details
   * @throws {Error} If track not found or authentication fails
   */
  fetchSongDetails = async (trackId, token = null) => {
    try {
      // Determine the token to validate
      const t = this._token_get(token);
      const { accessToken } = t;
      if (!trackId) {
        throw new Error("Track ID is required.");
      }

      // Send a GET request to Spotify's track endpoint
      const response = await axios.get(
        `https://api.spotify.com/v1/tracks/${trackId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );
      // Return the track details
      return response.data;
    } catch (e) {
      console.error("Error fetching track details:", e);
      throw e;
    }
  }

  /**
   * Fetches authentication token from file or creates new one
   * @returns {Promise<Object>} Token object containing access and refresh tokens
   * @throws {Error} If token file not found or invalid
   */
  fetchAuthToken = async () => {
    if (this.token === null) {
      try {
        if (!existsSync(TOKENFILE)) {
          throw new Error("No token file found");
        }
        this.token = JSON.parse(readFileSync(TOKENFILE, "utf-8"));

        const { accessToken, refreshToken, expiresAt } = this.token;
        if (!accessToken || !refreshToken || !expiresAt) {
          throw new Error("Token file is missing required properties: accessToken, refreshToken, or expiresAt.");
        }
        return { accessToken, refreshToken, expiresAt };
      } catch (e) {
        console.error('Error reading token:');
        throw e;
      }
    }
  }

  /**
   * Refreshes an expired access token
   * @param {string} [refreshToken=null] - Refresh token to use
   * @returns {Promise<Object>} New token object
   * @throws {Error} If refresh fails
   */
  refreshAuthToken = async (refreshToken = null) => {
    try {
      const tokenResponse = await axios.post(
        "https://accounts.spotify.com/api/token",
        querystring.stringify({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: client_id,
          client_secret: secret
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const newAccessToken = tokenResponse.data.access_token;
      const expiresIn = tokenResponse.data.expires_in;
      const expiresAt = Date.now() + expiresIn * 1000; // Calculate expiry time in milliseconds

      return {
        accessToken: newAccessToken,
        refreshToken: refreshToken,
        expiresIn: expiresIn,
        expiresAt: expiresAt
      };
    } catch (error) {
      console.error("Error refreshing access token:", error.message);
      return null;
    }
  }

  /**
   * Logs into Spotify using email and password
   * @param {string} email - Spotify account email
   * @param {string} password - Spotify account password
   * @returns {Promise<boolean>} True if login successful, false otherwise
   */
  loginToSpotify = async (email, password) => {
    try {
      browser = await puppeteer.launch({
        headless: true
      });
      const page = await browser.newPage();
      await page.goto('http://localhost:3000/login');

      // Wait for the username and password fields to load
      await page.waitForSelector('#login-username', { visible: true });
      await page.waitForSelector('#login-password', { visible: true });

      // Fill in the login form and submit
      await page.type('#login-username', email);
      await page.type('#login-password', password);
      await page.click('#login-button');

      console.log("Logging in...");

      try {
        console.log("Authorizing app to spotify account...");
        await page.waitForNavigation();
        await page.waitForSelector('.Button-sc-qlcn5g-0.hVnPpH', { timeout: 5000 });
        await page.click('.Button-sc-qlcn5g-0.hVnPpH');
      } catch (e) { } // ignore

      try {
        const errorMessage = await page.waitForSelector('.sc-gLXSEc.eZHyFP', {
          visible: true,
          timeout: 2000
        }).catch(() => null);

        if (errorMessage) {
          console.log('Login failed. Please check your credentials.');
          await browser.close();
          return false;
        } else {
          console.log(`${green}Login successful!${clr}`);
          await browser.close();
          return true;
        }
      } catch (error) {
        console.log(error);
      }
    } catch (e) {
      if (e instanceof TimeoutError) {
        console.log('Login successful!');
        await browser.close();
        return true;
      } else {
        console.log(e);
        await browser.close();
        return false;
      }
    }
  }

  /**
   * Searches for a song on Spotify
   * @param {string[]} artists - Array of artist names
   * @param {string} song - Song title
   * @param {string} [album] - Optional album name for more precise matching
   * @param {Object} [token=null] - Optional token object for authentication
   * @returns {Promise<Object>} Search results object
   * @property {boolean} success - Whether the search was successful
   * @property {string} message - Status message
   * @property {boolean} isLikelySong - Whether a likely match was found
   * @property {Array} tracks - Array of matching tracks
   */
  fetchSongSearch = async (artists, song, album, token = null) => {
    try {
      const t = this._token_get(token);
      const { accessToken } = t;

      const response = await axios.get('https://api.spotify.com/v1/search', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          q: `${song} - ${artists.join(' & ')}`,
          type: 'track',
          limit: 10
        }
      });

      const tracks = response.data.tracks.items;

      if (tracks.length === 0) {
        return {
          success: false,
          message: 'No songs found matching your search query',
          isLikelySong: false,
          tracks: []
        };
      }

      for (let i = 0; i < tracks.length; i++) {
        if (tracks[i].name === song && 
            tracks[i].artists.map(a => a.name).join(' & ') === artists.join(' & ') && 
            (album === undefined || tracks[i].album.name === album)) {
          return {
            success: true,
            message: 'Song found',
            isLikelySong: true,
            tracks: [tracks[i]]
          };
        }
      }

      return {
        success: false,
        message: 'No songs found matching your search query',
        isLikelySong: false,
        tracks: []
      };
    } catch (e) {
      console.error('Error searching for song:', e);
      throw e;
    }
  }

  /**
   * Fetches lyrics for a song from Genius
   * @param {string} trackName - Track name
   * @param {string} artistName - Artist name
   * @returns {Promise<string>} URL to lyrics page
   * @throws {Error} If lyrics not found or API request fails
   */
  fetchLyrics = async (trackName, artistName) => {
    try {
      // Search for the song on Genius
      const searchResponse = await axios.get(`${GENIUS_API_BASE_URL}/search`, {
        headers: {
          'Authorization': `Bearer ${geniusAccessToken}`
        },
        params: {
          q: `${trackName} ${artistName}`
        }
      });

      if (!searchResponse.data.response.hits.length) {
        throw new Error('No lyrics found for this song');
      }

      // Get the first hit's URL
      const songUrl = searchResponse.data.response.hits[0].result.url;

      // Fetch the webpage containing lyrics
      const response = await axios.get(songUrl);

      // Note: You'll need to parse the HTML to extract lyrics
      // This is a simplified example - you might want to use a proper HTML parser
      return `Lyrics can be found at: ${songUrl}`;
    } catch (error) {
      console.error('Error fetching lyrics:', error);
      throw error;
    }
  }
}

export default SpotifyManager;