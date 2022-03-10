import express from "express";
import auth from "../middleware/auth.js";
import {
	createProduct,
	getAllProducts,
	getProduct,
	editProduct,
	restockProduct,
	changePriceAndCost,
	deleteProduct,
} from "../controller/product-controller.js";

const router = express.Router();

router.post("/", auth, createProduct);
router.get("/", auth, getAllProducts);
router.get("/:productId", auth, getProduct);
router.patch("/:productId/restock", auth, restockProduct);
router.patch("/:productId/changePriceAndCost", auth, changePriceAndCost);
router.patch("/:productId", auth, editProduct);
router.delete("/:productId", auth, deleteProduct);

export default router;
