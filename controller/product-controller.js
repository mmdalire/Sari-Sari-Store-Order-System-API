import mongoose from "mongoose";

import HttpError from "../model/http-error.js";
import Order from "../model/order-model.js";
import Product from "../model/product-model.js";

import {
	productValidation,
	restockProductValidation,
	priceAndCostValidation,
} from "../util/validators/product-validate.js";

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
			isActive: true,
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
		description: req.body.description ? req.body.description.trim() : null,
		type: req.body.type.trim(),
		unit: req.body.unit ? req.body.unit.trim().toLowerCase() : "pieces",
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
	const {
		limit = 10,
		page = 1,
		search = "",
		sort = "createddate",
		order = "desc",
	} = req.query;
	const findParameters = {
		isActive: true,
		userId: req.userData.userId,
	};
	const sortParams = () => {
		switch (sort) {
			case "createddate":
				return "createdDate";
			case "updateddate":
				return "updatedDate";
			case "name":
				return "name";
			case "code":
				return "code";
			case "quantity":
				return "quantity";
			case "price":
				return "price";
			case "cost":
				return "cost";
			case "category":
				return "category";
		}
	};
	const orderParams = () => {
		return order === "desc" ? -1 : 1;
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
	const pipeline = [];

	try {
		const getActiveProductStage = {
			$match: {
				userId: mongoose.Types.ObjectId(req.userData.userId),
				isActive: true,
			},
		};
		pipeline.push(getActiveProductStage);

		const lookupOrdersStage = {
			$lookup: {
				from: "orders",
				localField: "code",
				foreignField: "products.code",
				as: "orders",
			},
		};
		pipeline.push(lookupOrdersStage);

		const displayStage = {
			$project: {
				_id: 1,
				name: 1,
				code: 1,
				category: 1,
				unit: 1,
				price: 1,
				cost: 1,
				quantity: 1,
				status: {
					$cond: {
						if: {
							$gt: [{ $size: "$orders" }, 0],
						},
						then: "IN-USE",
						else: "UNUSED",
					},
				},
				createdDate: 1,
			},
		};
		pipeline.push(displayStage);

		if (search) {
			const searchStage = {
				$match: {
					$or: [
						{ code: new RegExp(`${search.toUpperCase()}`) },
						{ name: new RegExp(`${search.toUpperCase()}`) },
						{ category: new RegExp(`${search.toUpperCase()}`) },
					],
				},
			};

			pipeline.push(searchStage);
		}

		const sortStage = {
			$sort: {
				[sortParams()]: orderParams(),
			},
		};
		pipeline.push(sortStage);

		const paginationStage = {
			$skip: (parseInt(page) - 1) * parseInt(limit),
		};
		pipeline.push(paginationStage);

		const limitStage = {
			$limit: parseInt(limit),
		};
		pipeline.push(limitStage);

		//Apply aggregation framework
		products = await Product.aggregate(pipeline);
	} catch (err) {
		return next(
			new HttpError(
				"Cannot retrieve products. Please try again later.",
				500
			)
		);
	}

	//Retrieve total count
	let productsCount;
	try {
		pipeline.splice(-3); //Remove last three stages for counting of documents (sort, limit, and skip)

		const countStage = {
			$count: "name",
		};
		pipeline.push(countStage);

		//Apply the aggregation pipeline
		productsCount = await Product.aggregate(pipeline).exec();

		productsCount =
			productsCount && productsCount.length
				? productsCount.pop().name
				: 0;
	} catch (err) {
		return next(
			new HttpError(
				"Cannot retrieve products. Please try again later!",
				500
			)
		);
	}

	res.status(200).json({ data: products, count: productsCount });
};

export const getProduct = async (req, res, next) => {
	const productId = req.params.productId;

	//Retrieve specific product by ID
	let product;

	try {
		const pipeline = [];

		const getOwnProductStage = {
			$match: {
				userId: mongoose.Types.ObjectId(req.userData.userId),
				_id: mongoose.Types.ObjectId(productId),
			},
		};
		pipeline.push(getOwnProductStage);

		const lookupCategoryStage = {
			$lookup: {
				from: "categories",
				localField: "category",
				foreignField: "name",
				as: "category",
			},
		};
		pipeline.push(lookupCategoryStage);

		const unwindCategoryStage = {
			$unwind: "$category",
		};
		pipeline.push(unwindCategoryStage);

		const matchOwnCategoryStage = {
			$match: {
				"category.userId": mongoose.Types.ObjectId(req.userData.userId),
			},
		};
		pipeline.push(matchOwnCategoryStage);

		const displayStage = {
			$project: {
				_id: 1,
				name: 1,
				code: 1,
				categoryCode: "$category.code",
				category: "$category.name",
				description: 1,
				type: 1,
				unit: 1,
				price: 1,
				cost: 1,
				quantity: 1,
			},
		};
		pipeline.push(displayStage);

		//Apply aggregation pipeline
		product = await Product.aggregate(pipeline).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot find this product. Please try again later.",
				404
			)
		);
	}

	if (product) {
		product = product.pop();
	}

	res.status(200).json(product);
};

export const restockProduct = async (req, res, next) => {
	const productId = req.params.productId;
	const quantity = req.body.quantity;

	//Ownership validation
	try {
		await Product.ownershipValidation(req.userData.userId, productId);
	} catch (err) {
		return next(new HttpError("Unauthorized access!", 401));
	}

	//Server validation
	const error = restockProductValidation(req.body);
	if (error) {
		return next(new HttpError(error, 422));
	}

	//Update stock quantity of a product
	try {
		await Product.updateOne(
			{
				_id: mongoose.Types.ObjectId(productId),
			},
			{
				$set: {
					quantity,
					updatedDate: Date.now(),
				},
			}
		);
	} catch (err) {
		return next(
			new HttpError(
				"Cannot restock this product. Please try again later!",
				500
			)
		);
	}

	res.status(200).json({ message: "Successfully updated product!" });
};

export const changePriceAndCost = async (req, res, next) => {
	const productId = req.params.productId;
	const price = req.body.price;
	const cost = req.body.cost;

	//Ownership validation
	try {
		await Product.ownershipValidation(req.userData.userId, productId);
	} catch (err) {
		return next(new HttpError("Unauthorized access!", 401));
	}

	//Server validation
	const error = priceAndCostValidation(req.body);
	if (error) {
		return next(new HttpError(error, 422));
	}

	//Update price and cost of a product
	try {
		await Product.updateOne(
			{
				_id: mongoose.Types.ObjectId(productId),
			},
			{
				$set: {
					price,
					cost,
					updatedDate: Date.now(),
				},
			}
		);
	} catch (err) {
		return next(
			new HttpError(
				"Cannot update price and cost of this product. Please try again later!",
				500
			)
		);
	}

	res.status(200).json({ message: "Successfully updated product!" });
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

	//If the code is changed OR everything is changed, check if the code has been used in other products
	if (product) {
		if (product.code !== req.body.code) {
			//Check if the code exists
			let codeExists;
			try {
				codeExists = await Product.findOne({
					code: req.body.code.toUpperCase(),
					userId: mongoose.Types.ObjectId(req.userData.userId),
				}).exec();
			} catch (err) {
				return next(
					new HttpError(
						"Cannot edit product. Please try again later!",
						500
					)
				);
			}

			if (codeExists) {
				return next(
					new HttpError(
						"This code already exists! Choose another code!",
						422
					)
				);
			}
		}
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

	req.body.description = req.body.description
		? req.body.description.trim()
		: "";
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
