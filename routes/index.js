import express from "express";

import userRoute from "./user-route.js";
import storeOwnerRoute from "./store_owner/index.js";
import storeRoute from "./store-route.js";

const router = express.Router();

router.use("/users", userRoute);
router.use("/storeowner", storeOwnerRoute);
router.use("/stores", storeRoute);

export default router;
