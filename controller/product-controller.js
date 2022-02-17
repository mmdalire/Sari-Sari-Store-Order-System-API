import mongoose from "mongoose";

import HttpError from "../model/http-error.js";
import Order from "../model/order-model.js";
import Product from "../model/product-model.js";

import { productValidation } from "../util/product-validate.js";

export const createProduct = async (req, res, next) => {
	//Server validation
	const error = productValidation(req.body);
	if (error) {
		return next(new HttpError(error, 422));
	}

	//Check if the code exists
	let codeExists;
	try {
		codeExists = await Product.findOne({
			code: req.body.code.toUpperCase(),
			userId: mongoose.Types.ObjectId(req.userData.userId),
		}).exec();
	} catch (err) {
		return next(
			new HttpError("Cannot create product. Please try again later!", 500)
		);
	}

	if (codeExists) {
		return next(
			new HttpError(
				"Product code already exists. Please try a new code!",
				422
			)
		);
	}

	//Save product info
	const product = new Product({
		name: req.body.name.trim().toUpperCase(),
		category: req.body.category.trim().toUpperCase(),
		code: req.body.code.trim().toUpperCase(),
		description: req.body.description.trim(),
		type: req.body.description.trim(),
		unit: req.body.unit ? req.body.unit.trim() : null,
		price: req.body.price,
		cost: req.body.cost,
		quantity: req.body.quantity,
		userId: req.userData.userId,
	});

	try {
		await product.save();
	} catch (err) {
		return next(
			new HttpError("Cannot create product. Please try again later!", 500)
		);
	}

	res.status(201).json(product);
};

export const getAllProducts = async (req, res, next) => {
	//Server searching and pagination
	const { limit = 10, page = 1, search = "" } = req.query;
	const findParameters = {
		isActive: true,
		userId: req.userData.userId,
	};

	if (search) {
		findParameters.$or = [
			{ code: new RegExp(`${search.toUpperCase()}`) },
			{ name: new RegExp(`${search.toUpperCase()}`) },
			{ category: new RegExp(`${search.toUpperCase()}`) },
		];
	}

	//Retrieve all products
	let products;

	try {
		products = await Product.find(findParameters, {
			code: 1,
			name: 1,
			category: 1,
			quantity: 1,
			unit: 1,
			price: 1,
			cost: 1,
		})
			.sort({ name: 1 })
			.limit(limit)
			.skip((page - 1) * limit)
			.exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot retrieve products. Please try again later.",
				500
			)
		);
	}

	res.status(200).json(products);
};

export const getProduct = async (req, res, next) => {
	const productId = req.params.productId;

	//Retrieve specific product by ID
	let product;
	try {
		product = await Product.findById(productId).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot find this product. Please try again later.",
				404
			)
		);
	}

	res.status(200).json(product);
};

export const editProduct = async (req, res, next) => {
	const productId = req.params.productId;
	let product;
	let orders;
	let allowProductInfoEdit = true;

	//Ownership validation
	try {
		await Product.ownershipValidation(req.userData.userId, productId);
	} catch (err) {
		return next(new HttpError("Unauthorized access!", 401));
	}

	//Get the reference product
	try {
		product = await Product.findById(productId).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot update this product. Please try again later!",
				500
			)
		);
	}

	//Check if an order has used this product
	try {
		orders = await Order.findOne({
			"products.code": product.code,
			userId: req.userData.userId,
		}).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot update this product. Please try again later!",
				500
			)
		);
	}

	//If there are any orders that uses this product, product's main info cannot be changed (name, code, etc)
	//Allow edit for that product ONLY when restocking (quantity) and change for price and cost
	if (orders) {
		allowProductInfoEdit = false;
	}

	//Server validation
	const error = productValidation(req.body, "update", allowProductInfoEdit);
	if (error) {
		return next(new HttpError(error, 422));
	}

	//Update product
	if (allowProductInfoEdit) {
		req.body.name = req.body.name.trim().toUpperCase();
		req.body.category = req.body.category.trim().toUpperCase();
		req.body.code = req.body.code.trim().toUpperCase();
		req.body.type = req.body.type.trim();
		req.body.unit = req.body.unit ? req.body.unit.trim() : null;
	} else {
		delete req.body.name;
		delete req.body.category;
		delete req.body.code;
		delete req.body.type;
		delete req.body.unit;
	}

	req.body.description = req.body.description.trim();
	req.body.updatedDate = Date.now();

	try {
		await Product.updateOne(
			{ _id: mongoose.Types.ObjectId(productId) },
			{ $set: req.body }
		);
	} catch (err) {
		return next(
			new HttpError(
				"Cannot update this product. Please try again later!",
				500
			)
		);
	}

	res.status(200).json({ message: "Successfully updated product!" });
};

export const deleteProduct = async (req, res, next) => {
	const productId = req.params.productId;
	let product;
	let orders;

	//Ownership validation
	try {
		await Product.ownershipValidation(req.userData.userId, productId);
	} catch (err) {
		return next(new HttpError("Unauthorized access!", 401));
	}

	//Get the reference product
	try {
		product = await Product.findById(productId).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot delete this product. Please try again later!",
				500
			)
		);
	}

	//Check if an order has used this product
	try {
		orders = await Order.findOne({
			"products.code": product.code,
			userId: req.userData.userId,
		}).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot delete this product. Please try again later!",
				500
			)
		);
	}

	//If there are any orders that uses this product, deletion is NOT allowed
	if (orders) {
		return next(
			new HttpError(
				"Cannot delete this product since there are order/s using this",
				422
			)
		);
	}

	//Update the product to be inactive ONLY (NOT delete)
	try {
		await Product.updateOne(
			{ _id: mongoose.Types.ObjectId(productId) },
			{
				$set: {
					deactivatedDate: Date.now(),
					isActive: false,
				},
			}
		);
	} catch (err) {
		return next(
			new HttpError(
				"Cannot delete this product! Please try again later!",
				500
			)
		);
	}

	res.status(200).json({ message: "Successfully deleted product!" });
};
