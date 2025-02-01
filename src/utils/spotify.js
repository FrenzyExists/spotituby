import { readFileSync, existsSync, writeFileSync } from 'fs';
import { GENIUS_API_BASE_URL, TOKENFILE } from '../utils.js';
import { client_id, secret, redirectUri, scope } from "./dotenv.js";
import axios from 'axios';
import querystring from 'querystring';


const SpotifyManager = class {
  /**
   * 
   * @param {Object} token 
   */
  constructor(token = null, email = null, password = null) {
    this.accessToken = null;
    this.token = token;
    this.email = email;
    this.password = password;
  }

  /**
   * 
   * @param {number} page_size 
   * @param {boolean} include_liked_songs 
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
   * 
   * @param {*} page_size 
   * @returns 
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

  clearAuthToken = async () => {

  }

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

  fetchUser = async () => {

  }

  fetchSong = async () => {

  }

  fetchAlbum = async () => { }

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
        return accessToken; // Token is still valid
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

      // Refresh success
      console.debug("Token refreshed successfully.");
      return newTokenData.accessToken;
    } catch (e) {
      console.error("Error in validateAuthToken:", e.message);
      throw e; // Re-throw to propagate the error to the caller
    }
  }

  _token_get = (token) => {
    const t = token || this.token;
    if (!t) {
      throw new Error("No token provided or available in the instance.");
    }
    return t;
  }

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
  };

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
        // console.log(this.token);
        return { accessToken, refreshToken, expiresAt };
      } catch (e) {
        console.error('Error reading token:');
        throw e;
      }
    }

  }

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
      console.log("REFRESH", tokenResponse.data);

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


  loginToSpotify = async (email, password) => {
    try {
      browser = await puppeteer.launch({
        headless: true
      });
      const page = await browser.newPage();
      await page.goto('http://localhost:3000/login');

      // Wait for the username and password fields to load
      await page.waitForSelector('#login-username', {
        visible: true
      });
      await page.waitForSelector('#login-password', {
        visible: true
      });

      // Fill in the login form and submit
      await page.type('#login-username', email);
      await page.type('#login-password', password);

      // Click the login button
      await page.click('#login-button');

      console.log("Logging in...");

      try {
        console.log("Authorizing app to spotify account...");
        // Wait for navigation
        await page.waitForNavigation();

        // Wait for the selector
        await page.waitForSelector('.Button-sc-qlcn5g-0.hVnPpH', {
          timeout: 5000,
        });
        // Click the button
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

  fetchSongSearch = async (query, token = null) => {
    try {
      const t = this._token_get(token);
      const { accessToken } = t;

      if (!query || typeof query !== 'string') {
        throw new Error('Search query must be a non-empty string');
      }

      const response = await axios.get('https://api.spotify.com/v1/search', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          q: query,
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
      return tracks[0];
    } catch (e) {
      console.log(e);
    }
  }

  /**
   * Fetch lyrics for a given track
   * @param {string} trackName - The name of the track
   * @param {string} artistName - The name of the artist
   * @returns {Promise<string>} - The lyrics of the song
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