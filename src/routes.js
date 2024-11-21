import express from "express";
import SpotitubeController from "./controllers.js";

const router = express.Router();

router.get('/login', SpotitubeController.postMyCredentialsLogin);
router.get('/callback', SpotitubeController.postMyCredentialsCallback);

router.get('/me', SpotitubeController.whoAmI);
router.get('/me/playlist', SpotitubeController.getMyPlaylist);

export default router;
