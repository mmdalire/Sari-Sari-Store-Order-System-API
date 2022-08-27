import express from "express";

import categoryRoute from "./category-route.js";
import customerRoute from "./customer-route.js";
import dashboardRoute from "./dashboard-route.js";
import inventoryRoute from "./inventory-route.js";
import orderRoute from "./order-route.js";
import productRoute from "./product-route.js";
import purchaseReturnRoute from "./purchase-return-route.js";

const router = express.Router();

router.use("/categories", categoryRoute);
router.use("/customers", customerRoute);
router.use("/dashboard", dashboardRoute);
router.use("/inventory", inventoryRoute);
router.use("/orders", orderRoute);
router.use("/products", productRoute);
router.use("/purchase_returns", purchaseReturnRoute);

export default router;
