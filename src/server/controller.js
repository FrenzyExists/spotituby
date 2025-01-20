import axios from "axios";
import querystring from "querystring";
import { client_id, redirectUri, secret } from "./utils/dotenv.js";

class SpotitubeController { }

SpotitubeController.postMyCredentialsLogin = (req, res) => {
    const scope = "user-read-recently-played user-top-read user-read-playback-position user-read-playback-state user-modify-playback-state user-read-currently-playing user-library-modify user-library-read app-remote-control streaming playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private user-follow-read user-follow-modify ugc-image-upload user-read-email user-read-private";

    const authUrl = `https://accounts.spotify.com/authorize?${querystring.stringify(
        {
            response_type: "code",
            client_id: client_id,
            scope: scope,
            redirect_uri: redirectUri,
            show_dialog: true
        }
    )}`;

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

            const newAccessToken = tokenResponse.data.access_token;
            const refreshToken = tokenResponse.data.refresh_token;
            const expiresIn = tokenResponse.data.expires_in;
            const expiresAt = Date.now() + expiresIn * 1000; // Calculate expiry time in milliseconds
            process.send({
                accessToken: newAccessToken,
                refreshToken: refreshToken,
                expiresIn: expiresIn,
                expiresAt: expiresAt
            });


            res.json({
                message: "Authorization successful!",
                accessToken: newAccessToken,
                refreshToken: refreshToken,
                expiresIn: expiresIn,
                expiresAt: expiresAt,
                code: code,
            });

        } catch (error) {
            res.status(500).json({ error: "Failed to retrieve access token" });
        }
    } else {
        res.status(400).send("No authorization code found");
    }
};

export default SpotitubeController;
