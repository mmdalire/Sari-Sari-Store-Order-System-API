import mongoose from "mongoose";

import HttpError from "../model/http-error.js";
import Order from "../model/order-model.js";
import Product from "../model/product-model.js";
import PurchaseReturn from "../model/purchase-return-model.js";

export const viewAllProducts = async (req, res, next) => {
	//Server pagination and filtering
	const { limit = 20, page = 1, search = "", lowThreshold = 0 } = req.query;
	const findParams = {
		userId: req.userData.userId,
	};
	let products;

	if ("isActive" in req.query) {
		findParams.isActive = true;
	}

	if (lowThreshold) {
		findParams.quantity = {
			$lte: parseInt(lowThreshold),
		};
	}

	if (search) {
		findParams.$or = [
			{ name: new RegExp(`${search.toUpperCase()}`) },
			{ category: new RegExp(`${search.toUpperCase()}`) },
			{ code: new RegExp(`${search.toUpperCase()}`) },
		];
	}

	try {
		products = await Product.find(findParams, {
			description: 0,
			type: 0,
			userId: 0,
		})
			.sort({
				name: 1,
			})
			.limit(limit)
			.skip((page - 1) * limit)
			.exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot retrieve products. Please try again later!",
				500
			)
		);
	}

	res.status(200).send(products);
};

export const viewProduct = async (req, res, next) => {
	const productId = req.params.productId;
	let product;

	try {
		product = await Product.findById(productId).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot retrieve this product. Please try again later!",
				500
			)
		);
	}

	if (!product) {
		return next(new HttpError("Cannot find this product.", 404));
	}

	res.status(200).json(product);
};

export const viewOrdersWithProduct = async (req, res, next) => {
	const productId = req.params.productId;
	let product;
	let productSummary;
	let orders;

	//Server pagination and filtering
	const { limit = 20, page = 1, search = "" } = req.query;

	//Get the product code as reference
	try {
		product = await Product.findById(productId).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot retrieve this product. Please try again later!",
				500
			)
		);
	}

	if (!product) {
		return next(new HttpError("Cannot find this product.", 404));
	}

	//Get the summary for the product and all the orders involving the product
	try {
		const pipeline = [];

		const matchProductStage = {
			$match: {
				"products.code": product.code,
				userId: mongoose.Types.ObjectId(req.userData.userId),
				status: "SUBMIT",
			},
		};
		pipeline.push(matchProductStage);

		const unwindProductStage = {
			$unwind: {
				path: "$products",
				preserveNullAndEmptyArrays: true,
			},
		};
		pipeline.push(unwindProductStage);

		//After flattening the results, get only the selected product in each SUBMITTED orders
		pipeline.push(matchProductStage);

		const groupByProductResultsStage = {
			$group: {
				_id: "$products.code",
				quantity: {
					$sum: "$products.quantity",
				},
				price: {
					$sum: {
						$multiply: ["$products.quantity", "$products.price"],
					},
				},
				cost: {
					$sum: {
						$multiply: ["$products.quantity", "$products.cost"],
					},
				},
			},
		};
		pipeline.push(groupByProductResultsStage);

		//Getting the summary for the product based on SUBMITTED orders
		productSummary = await Order.aggregate(pipeline).exec();

		//Remove the last grouping stage. Grouping stage will be replaced with the same stage but different operations since we will be displaying the order related to that product
		pipeline.pop();

		const groupByOrderStage = {
			$group: {
				_id: "$_id",
				poNo: {
					$first: "$poNo",
				},
				quantity: {
					$sum: "$products.quantity",
				},
				price: {
					$sum: {
						$multiply: ["$products.quantity", "$products.price"],
					},
				},
				cost: {
					$sum: {
						$multiply: ["$products.quantity", "$products.cost"],
					},
				},
				createdDate: {
					$first: "$createdDate",
				},
				updatedDate: {
					$first: "$updatedDate",
				},
			},
		};
		pipeline.push(groupByOrderStage);

		if (search) {
			const searchStage = {
				$match: {
					$or: [{ poNo: new RegExp(`${search.toUpperCase()}`) }],
				},
			};
			pipeline.push(searchStage);
		}

		const sortStage = {
			$sort: {
				createdDate: -1,
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

		//Getting the orders list for the product based on SUBMITTED orders
		orders = await Order.aggregate(pipeline).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot retrieve this product. Please try again later!",
				500
			)
		);
	}

	res.status(200).send({
		summary:
			productSummary && productSummary.length > 0
				? productSummary.pop()
				: [],
		list: orders,
	});
};

export const viewPrtWithProduct = async (req, res, next) => {
	const productId = req.params.productId;
	let product;
	let productSummary;
	let prts;

	//Server pagination and filtering
	const { limit = 20, page = 1, search = "" } = req.query;

	//Get the product code as reference
	try {
		product = await Product.findById(productId).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot retrieve this product. Please try again later!",
				500
			)
		);
	}

	if (!product) {
		return next(new HttpError("Cannot find this product.", 404));
	}

	//Get the summary for the product and all the purchase returns involving the product
	try {
		const pipeline = [];

		const matchProductStage = {
			$match: {
				"returnedProducts.code": product.code,
				userId: mongoose.Types.ObjectId(req.userData.userId),
			},
		};
		pipeline.push(matchProductStage);

		const unwindProductStage = {
			$unwind: {
				path: "$returnedProducts",
				preserveNullAndEmptyArrays: true,
			},
		};
		pipeline.push(unwindProductStage);

		//After flattening the results, get only the selected product in each purchase returns
		pipeline.push(matchProductStage);

		const groupByProductResultsStage = {
			$group: {
				_id: "$returnedProducts.code",
				quantity: {
					$sum: "$returnedProducts.quantity",
				},
				price: {
					$sum: {
						$multiply: [
							"$returnedProducts.quantity",
							"$returnedProducts.price",
						],
					},
				},
			},
		};
		pipeline.push(groupByProductResultsStage);

		//Getting the summary for the product based on purchase returns
		productSummary = await PurchaseReturn.aggregate(pipeline).exec();

		//Remove the last grouping stage. Grouping stage will be replaced with the same stage but different operations since we will be displaying the purchase return related to that product
		pipeline.pop();

		const groupByPrtStage = {
			$group: {
				_id: "$_id",
				poNo: {
					$first: "$prtNo",
				},
				quantity: {
					$sum: "$returnedProducts.quantity",
				},
				price: {
					$sum: {
						$multiply: [
							"$returnedProducts.quantity",
							"$returnedProducts.price",
						],
					},
				},
				createdDate: {
					$first: "$createdDate",
				},
			},
		};
		pipeline.push(groupByPrtStage);

		if (search) {
			const searchStage = {
				$match: {
					$or: [{ prtNo: new RegExp(`${search.toUpperCase()}`) }],
				},
			};
			pipeline.push(searchStage);
		}

		const sortStage = {
			$sort: {
				createdDate: -1,
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

		//Getting the purchase return list for the product based on SUBMITTED orders
		prts = await PurchaseReturn.aggregate(pipeline).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot retrieve this product. Please try again later!",
				500
			)
		);
	}

	res.status(200).send({
		summary:
			productSummary && productSummary.length > 0
				? productSummary.pop()
				: [],
		list: prts,
	});
};
