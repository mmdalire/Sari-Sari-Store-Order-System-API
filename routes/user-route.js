import express from "express";

import auth from "../middleware/auth.js";
import {
	signup,
	login,
	changePassword,
} from "../controller/users-controller.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/change_password", auth, changePassword);

export default router;
