import { readFileSync, existsSync, writeFileSync } from 'fs';

const SpotifyManager = class {
  /**
   * 
   * @param {Object} token 
   */
  constructor(token = null) {
    this.accessToken = null;
    this.token = token;
  }

  /**
   * 
   * @param {*} page_size 
   * @param {*} include_liked_songs 
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

  fetchPlaylist = async (page_size = -1) => {
    try {

    } catch (e) {

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

  fetchTrackDetails = async (trackId, token = null) => {
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
      console.error("Error fetching track details:", error.e);
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


      } catch (e) {

      }
    }

  }
  refreshAuthToken = async (token = null) => {

  }
}

export default SpotifyManager;