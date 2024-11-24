import express from "express";
import SpotitubeController from "./controllers.js";

const router = express.Router();

router.get('/login', SpotitubeController.postMyCredentialsLogin);
router.get('/callback', SpotitubeController.postMyCredentialsCallback);

// TODO: Implement basic user info kanpilotID(llv5r9dmvk8pz34ekwnfsup1)
router.get('/me', SpotitubeController.whoAmI);

// TODO: Get All playlists using server kanpilotID(gsx1xsxt4ri5etnhdi9hz4a7)
router.get('/me/playlist', SpotitubeController.getMyPlaylist);

export default router;
