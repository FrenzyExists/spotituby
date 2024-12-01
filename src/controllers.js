import axios from "axios";
import querystring from "querystring";
import { client_id, redirectUri, secret } from "./utils/dotenv.js";

class SpotitubeController {}

SpotitubeController.postMyCredentialsLogin = (req, res) => {
  const scope = "playlist-read-private user-read-private user-read-email playlist-read-collaborative user-top-read user-library-read user-follow-read";

  const authUrl = `https://accounts.spotify.com/authorize?${querystring.stringify(
    {
      response_type: "code",
      client_id: client_id,
      scope: scope,
      redirect_uri: redirectUri,
    }
  )}`;
  // uncomment this for debug
  // console.log(`\n--------------------------------------\nRedirecting to:\n${authUrl}\n--------------------------------------`);

  res.redirect(authUrl);
};

SpotitubeController.postMyCredentialsCallback = async (req, res) => {
  const code = req.query.code;
  if (code) {
    try {
      const tokenResponse = await axios.post(
        "https://accounts.spotify.com/api/token",
        querystring.stringify({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: redirectUri,
          client_id: client_id,
          client_secret: secret,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const accessToken = tokenResponse.data.access_token;
      const refreshToken = tokenResponse.data.refresh_token;
      // uncomment this for debug
      // console.log(`\n--------------------------------------\naccess token:\naccessToken\n--------------------------------------`);

      const expiresTokenTime = tokenResponse.data.expires_in;
      process.send?.(accessToken);

      res.json({
        message: "Authorization successful!",
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresTokenTime: expiresTokenTime,
        code: code,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve access token" });
    }
  } else {
    res.status(400).send("No authorization code found");
  }
};

SpotitubeController.getMyPlaylist = (req, res) => {
  const {} = req.params;
  // can take the following parameters
  // id, playlist_name, page, size
  // can return stuff like
  // a list of playlists. Each playlist object has the id, the name, the url of the api to use, the first 10 songs
  // if you use the id or the playlist_name it gets
  // the id, the name, a list of objects that is the songs
  // each song contains names, urls of the song in spotify, album, artist, and other info
};

export default SpotitubeController;
