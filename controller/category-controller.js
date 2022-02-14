import mongoose from "mongoose";

import HttpError from "../model/http-error.js";
import Category from "../model/category-model.js";
import Product from "../model/product-model.js";

import { categoryValidation } from "../util/category-validate.js";

export const createCategory = async (req, res, next) => {
	//Server side validation
	const error = categoryValidation(req.body);
	if (error) {
		return next(new HttpError(error, 422));
	}

	//Check if the code exists
	let codeExists;
	try {
		codeExists = await Category.findOne({
			code: req.body.code.toUpperCase(),
			userId: mongoose.Types.ObjectId(req.userData.userId),
		}).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot create category. Please try again later!",
				500
			)
		);
	}

	if (codeExists) {
		return next(
			new HttpError("This code already exists! Choose another code!", 422)
		);
	}

	//Save category info
	const category = new Category({
		name: req.body.name.trim().toUpperCase(),
		code: req.body.code.trim().toUpperCase(),
		userId: req.userData.userId,
	});
	try {
		await category.save();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot create category. Please try again later!",
				500
			)
		);
	}

	res.status(201).json(category);
};

export const getAllCategories = async (req, res, next) => {
	//Server searching and pagination
	const { limit = 10, page = 1, search = "" } = req.query;
	const findParameters = { isActive: true, userId: req.userData.userId };

	if (search) {
		findParameters.$or = [
			{ name: new RegExp(`${search.toUpperCase()}`) },
			{ code: new RegExp(`${search.toUpperCase()}`) },
		];
	}

	//Retrieve all categories
	let categories;
	try {
		categories = await Category.find(findParameters, {
			code: 1,
			name: 1,
		})
			.sort({
				code: 1,
			})
			.limit(limit)
			.skip((page - 1) * limit)
			.exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot retrieve categories. Please try again later!",
				500
			)
		);
	}

	res.status(200).send(categories);
};

export const editCategory = async (req, res, next) => {
	const categoryId = req.params.categoryId;

	//Ownership validation
	try {
		await Category.ownershipValidation(req.userData.userId, categoryId);
	} catch (err) {
		return next(new HttpError("Unauthorized access!", 401));
	}

	//Check if a product has used this category
	let existingProduct;
	try {
		let category = await Category.findById(categoryId).exec();
		existingProduct = await Product.findOne({
			category: category.name,
			isActive: true,
			userId: mongoose.Types.ObjectId(req.userData.userId),
		}).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot update this category. Please try again later!",
				500
			)
		);
	}

	if (existingProduct) {
		return next(
			new HttpError(
				"Cannot update this category since there are product/s using this",
				422
			)
		);
	}

	//Check if the code exists
	let codeExists;
	try {
		codeExists = await Category.findOne({
			code: req.body.code.toUpperCase(),
			userId: mongoose.Types.ObjectId(req.userData.userId),
		}).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot create category. Please try again later!",
				500
			)
		);
	}

	if (codeExists) {
		return next(
			new HttpError("This code already exists! Choose another code!", 422)
		);
	}

	//Server side validation
	const error = categoryValidation(req.body);
	if (error) {
		return next(new HttpError(error, 422));
	}

	//Update the category
	req.body.name = req.body.name.trim().toUpperCase();
	req.body.code = req.body.code.trim().toUpperCase();
	req.body.updatedDate = Date.now();

	try {
		await Category.updateOne(
			{ _id: mongoose.Types.ObjectId(categoryId) },
			{
				$set: req.body,
			}
		).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot update this category. Please try again later!",
				500
			)
		);
	}

	res.status(200).send({ message: "Successfully updated category!" });
};

export const deleteCategory = async (req, res, next) => {
	const categoryId = req.params.categoryId;

	//Ownership validation
	try {
		await Category.ownershipValidation(req.userData.userId, categoryId);
	} catch (err) {
		return next(new HttpError("Unauthorized access!", 401));
	}

	//Check if a product has used this category
	let existingProduct;
	try {
		let category = await Category.findById(categoryId).exec();
		existingProduct = await Product.findOne({
			category: category.name,
			isActive: true,
			userId: mongoose.Types.ObjectId(req.userData.userId),
		}).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot delete this category. Please try again later!",
				500
			)
		);
	}

	if (existingProduct) {
		return next(
			new HttpError(
				"Cannot update this category since there are product/s using this",
				422
			)
		);
	}

	//Update the category to be inactive ONLY (NOT delete)
	try {
		await Category.updateOne(
			{ _id: mongoose.Types.ObjectId(categoryId) },
			{
				$set: {
					isActive: false,
					deactivatedDate: Date.now(),
				},
			}
		);
	} catch (err) {
		return next(
			new HttpError("Cannot delete this category. Try again later!", 500)
		);
	}

	res.status(200).json({
		message: "Successfully deleted category!",
	});
};
