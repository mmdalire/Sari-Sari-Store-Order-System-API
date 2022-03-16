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
			isActive: true,
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
	const {
		limit,
		page,
		search = "",
		sort = "createddate",
		order = "desc",
	} = req.query;
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
		}
	};
	const orderParams = () => {
		return order === "desc" ? -1 : 1;
	};

	//Retrieve all categories
	const pipeline = [];
	let categories;

	try {
		const activeCategoriesStage = {
			$match: {
				userId: mongoose.Types.ObjectId(req.userData.userId),
				isActive: true,
			},
		};
		pipeline.push(activeCategoriesStage);

		const lookupProducts = {
			$lookup: {
				from: "products",
				localField: "name",
				foreignField: "category",
				as: "products",
			},
		};
		pipeline.push(lookupProducts);

		const displayStage = {
			$project: {
				_id: 1,
				name: 1,
				code: 1,
				status: {
					$cond: {
						if: {
							$gt: [{ $size: "$products" }, 0],
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
						{ name: new RegExp(`${search.toUpperCase()}`) },
						{ code: new RegExp(`${search.toUpperCase()}`) },
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

		//Page and limit will be used ONLY for listing purposes. Data to be used for dropdowns DO NOT NEED to be paginated
		if (page) {
			const paginationStage = {
				$skip: (parseInt(page) - 1) * parseInt(limit),
			};
			pipeline.push(paginationStage);
		}

		if (limit) {
			const limitStage = {
				$limit: parseInt(limit),
			};
			pipeline.push(limitStage);
		}

		//Apply the aggregation pipeline
		categories = await Category.aggregate(pipeline).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot retrieve categories. Please try again later!",
				500
			)
		);
	}

	//Retrieve total count
	let categoriesCount;
	try {
		if (limit && page) {
			pipeline.splice(-3); //Remove last three stages for counting of documents (sort, limit, and skip) [FOR LISTING]
		} else {
			pipeline.pop(); //Remove only the sort stage [FOR DROPDOWNS]
		}

		const countStage = {
			$count: "name",
		};
		pipeline.push(countStage);

		//Apply the aggregation pipeline
		categoriesCount = await Category.aggregate(pipeline).exec();

		categoriesCount =
			categoriesCount && categoriesCount.length
				? categoriesCount.pop().name
				: 0;
	} catch (err) {
		return next(
			new HttpError(
				"Cannot retrieve categories. Please try again later!",
				500
			)
		);
	}

	res.status(200).send({ data: categories, count: categoriesCount });
};

export const getCategory = async (req, res, next) => {
	const categoryId = req.params.categoryId;
	let category;

	try {
		category = await Category.findById(categoryId, {
			name: 1,
			code: 1,
		}).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot retrieve this category. Please try again later!",
				500
			)
		);
	}

	res.status(200).json(category);
};

export const getAllProductsByCategory = async (req, res, next) => {
	const categoryId = req.params.categoryId;
	const { limit = 10, page = 1 } = req.query;
	let categoryInfo;
	let products;
	let productsCount;

	//Get the category information
	try {
		categoryInfo = await Category.findById(categoryId, {
			name: 1,
			code: 1,
		}).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot retrieve this category. Please try again later!",
				500
			)
		);
	}

	if (!categoryInfo) {
		return next(new HttpError("This category does not exists!", 400));
	}

	//Retrieve total count of products
	try {
		productsCount = await Product.countDocuments(
			{
				category: categoryInfo.name,
			},
			{
				category: 1,
				name: 1,
				quantity: 1,
			}
		).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot retrieve products. Please try again later!",
				500
			)
		);
	}

	//Get the products
	try {
		products = await Product.find(
			{
				category: categoryInfo.name,
			},
			{
				code: 1,
				category: 1,
				name: 1,
				quantity: 1,
			}
		)
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

	res.status(200).json({
		info: categoryInfo,
		products,
		count: productsCount,
	});
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

	//If only the name is changed, bypass the validation of checking when the code has been used in other categories
	let referenceCategory;
	try {
		referenceCategory = await Category.findOne({
			code: req.body.code.toUpperCase(),
			userId: mongoose.Types.ObjectId(req.userData.userId),
		}).exec();
	} catch (err) {
		return next(
			new HttpError("Cannot edit category. Please try again later!", 500)
		);
	}

	//If the code is changed OR everything is changed, check if the code has been used in other categories
	if (referenceCategory) {
		if (referenceCategory.code !== req.body.code) {
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
					new HttpError(
						"This code already exists! Choose another code!",
						422
					)
				);
			}
		}
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
