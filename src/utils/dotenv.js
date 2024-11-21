import dotenv from 'dotenv'

dotenv.config();

export const client_id = process.env.SPOTIFY_CLIENT_ID;
export const secret = process.env.SPOTIFY_CLIENT_SECRET;
export const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
export const scope = process.env.SPOTIFY_SCOPE;