import express from "express";

import auth from "../middleware/auth.js";
import {
	getAllStores,
	getProductsInStores,
} from "../controller/store-controller.js";

const router = express.Router();

router.get("/", auth, getAllStores);
router.get("/:userId", auth, getProductsInStores);

export default router;
