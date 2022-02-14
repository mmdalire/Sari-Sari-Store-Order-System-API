import express from "express";

import auth from "../middleware/auth.js";
import {
	createOrder,
	getAllOrders,
	getOrder,
	editOrder,
	cancelOrder,
} from "../controller/order-controller.js";

const router = express.Router();

router.post("/", auth, createOrder);
router.get("/", auth, getAllOrders);
router.get("/:orderId", auth, getOrder);
router.patch("/:orderId", auth, editOrder);
router.delete("/:orderId", auth, cancelOrder);

export default router;
