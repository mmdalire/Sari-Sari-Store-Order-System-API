import express from "express";

import auth from "../../middleware/auth.js";
import {
	analytics,
	getTopProducts,
	getTopCustomers,
} from "../../controller/dashboard-controller.js";

const router = express.Router();

router.get("/:userId/products", auth, getTopProducts);
router.get("/:userId/customers", auth, getTopCustomers);
router.get("/:userId", auth, analytics);

export default router;
