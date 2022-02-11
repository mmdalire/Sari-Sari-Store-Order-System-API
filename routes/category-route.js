import express from "express";

import auth from "../middleware/auth.js";
import {
	createCategory,
	getAllCategories,
	editCategory,
	deleteCategory,
} from "../controller/category-controller.js";

const router = express.Router();

router.post("/", auth, createCategory);
router.get("/", auth, getAllCategories);
router.patch("/:categoryId", auth, editCategory);
router.delete("/:categoryId", auth, deleteCategory);

export default router;
