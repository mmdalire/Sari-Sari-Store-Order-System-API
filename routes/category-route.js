import express from "express";

import auth from "../middleware/auth.js";
import {
	createCategory,
	getAllCategories,
	getAllProductsByCategory,
	getCategory,
	editCategory,
	deleteCategory,
} from "../controller/category-controller.js";

const router = express.Router();

router.post("/", auth, createCategory);
router.get("/", auth, getAllCategories);
router.get("/:categoryId/products", auth, getAllProductsByCategory);
router.get("/:categoryId", auth, getCategory);
router.patch("/:categoryId", auth, editCategory);
router.delete("/:categoryId", auth, deleteCategory);

export default router;
