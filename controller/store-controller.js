import mongoose from "mongoose";

import HttpError from "../model/http-error.js";
import Product from "../model/product-model.js";
import User from "../model/user-model.js";

import {
	matchStage,
	projectStage,
	paginationStage,
	limitStage,
} from "../util/mongodb-util.js";

export const getAllStores = async (req, res, next) => {
	let stores;
	const pipeline = [];

	//Server pagination and filtering
	const { limit = 10, page = 1, search = "" } = req.query;

	try {
		//Aggregation pipeline stages
		const isActiveStage = matchStage({
			store: {
				$ne: null,
			},
			isActive: true,
		});
		pipeline.push(isActiveStage);

		const displayStage = projectStage({
			_id: 1,
			storeName: "$store.name",
			storeStartingDate: {
				$toDate: "$store.startingDate",
			},
			owner: {
				$concat: ["$firstName", " ", "$lastName"],
			},
		});
		pipeline.push(displayStage);

		if (search) {
			const searchStage = matchStage({
				$or: [
					{
						owner: new RegExp(`${search.toUpperCase()}`),
					},
					{
						storeName: new RegExp(`${search.toUpperCase()}`),
					},
				],
			});

			pipeline.push(searchStage);
		}

		pipeline.push(paginationStage(page, limit));
		pipeline.push(limitStage(limit));

		//Apply the aggregation pipeline
		stores = await User.aggregate(pipeline).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot retrieve stores. Please try again later!",
				500
			)
		);
	}

	res.status(200).json({ data: stores });
};

export const getProductsInStores = async (req, res, next) => {
	let products;
	const userId = req.params.userId;
	const pipeline = [];

	//Server pagination and filtering
	const { limit = 10, page = 1, search = "" } = req.query;

	try {
		//Aggregation pipeline stages
		const isActiveStage = matchStage({
			userId: mongoose.Types.ObjectId(userId),
			isActive: true,
		});
		pipeline.push(isActiveStage);

		const displayStage = projectStage({
			_id: 1,
			code: 1,
			name: 1,
			description: 1,
			price: 1,
			cost: 1,
			quantity: 1,
			unit: 1,
		});
		pipeline.push(displayStage);

		if (search) {
			const searchStage = matchStage({
				$or: [
					{
						code: new RegExp(`${search.toUpperCase()}`),
					},
					{
						name: new RegExp(`${search.toUpperCase()}`),
					},
				],
			});

			pipeline.push(searchStage);
		}

		pipeline.push(paginationStage(page, limit));
		pipeline.push(limitStage(limit));

		//Apply the aggregation pipeline
		products = await Product.aggregate(pipeline).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot retrieve products for this store. Please try again later!",
				500
			)
		);
	}

	res.status(200).json({ data: products });
};
