import express from "express";
import SpotitubeController from "./controllers.js";

const router = express.Router();

router.get('/login', SpotitubeController.postMyCredentialsLogin);
router.get('/callback', SpotitubeController.postMyCredentialsCallback);

export default router;
