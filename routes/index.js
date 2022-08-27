import express from "express";

import userRoute from "./user-route.js";
import storeOwnerRoute from "./store_owner/index.js";

const router = express.Router();

router.use("/users", userRoute);
router.use("/storeowner", storeOwnerRoute);

export default router;
