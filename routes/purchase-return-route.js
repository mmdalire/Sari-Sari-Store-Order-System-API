import express from "express";

import auth from "../middleware/auth.js";
import {
	createPurchaseReturn,
	getAllPurchaseReturns,
	getPurchaseReturn,
	getPurchaseReturnByOrder,
} from "../controller/purchase-return-controller.js";

const router = express.Router();

router.post("/", auth, createPurchaseReturn);
router.get("/", auth, getAllPurchaseReturns);
router.get("/:orderNo/order", auth, getPurchaseReturnByOrder);
router.get("/:purchaseReturnId", auth, getPurchaseReturn);

export default router;
