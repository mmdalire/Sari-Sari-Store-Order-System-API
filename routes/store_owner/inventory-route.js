import express from "express";

import {
	viewAllProducts,
	viewProduct,
	viewOrdersWithProduct,
	viewPrtWithProduct,
} from "../../controller/inventory-controller.js";
import auth from "../../middleware/auth.js";

const router = express.Router();

router.get("/", auth, viewAllProducts);
router.get("/:productId/orders", auth, viewOrdersWithProduct);
router.get("/:productId/purchase_returns", auth, viewPrtWithProduct);
router.get("/:productId", auth, viewProduct);

export default router;
