import mongoose from "mongoose";

import HttpError from "../model/http-error.js";
import Order from "../model/order-model.js";
import Product from "../model/product-model.js";
import PurchaseReturn from "../model/purchase-return-model.js";

const getDateConfig = () => {
	const getDayToday = new Date().getDate();
	const getMonthToday = new Date().getMonth();
	const getYearToday = new Date().getFullYear();

	return {
		dateToday: new Date(Date.UTC(getYearToday, getMonthToday, getDayToday)),
		dateTomorrow: new Date(
			Date.UTC(getYearToday, getMonthToday, getDayToday + 1)
		),
	};
};

export const analytics = async (req, res, next) => {
	let ordersAnalytics;
	let purchaseReturnAnalytics;
	let productsCount;
	let returnedProductsCount;

	//Get day today
	const { dateToday, dateTomorrow } = getDateConfig();

	try {
		//Get the summaries for all orders within a day range
		let pipeline = [];

		const matchOrderDayRangeStage = {
			$match: {
				createdDate: {
					$gte: new Date(dateToday.toISOString()),
					$lt: new Date(dateTomorrow.toISOString()),
				},
				isActive: true,
				status: "SUBMIT",
				userId: mongoose.Types.ObjectId(req.userData.userId),
			},
		};
		pipeline.push(matchOrderDayRangeStage);

		const unwindProductStage = {
			$unwind: {
				path: "$products",
				preserveNullAndEmptyArrays: true,
			},
		};
		pipeline.push(unwindProductStage);

		const computeOrderTotalStage = {
			$group: {
				_id: "$userId",
				totalPriceSold: {
					$sum: {
						$multiply: ["$products.quantity", "$products.price"],
					},
				},
				totalCost: {
					$sum: {
						$multiply: ["$products.quantity", "$products.cost"],
					},
				},
			},
		};
		pipeline.push(computeOrderTotalStage);

		const displayStage = {
			$project: {
				totalPriceSold: 1,
				totalCost: 1,
				totalProfit: {
					$subtract: ["$totalPriceSold", "$totalCost"],
				},
			},
		};
		pipeline.push(displayStage);

		ordersAnalytics = await Order.aggregate(pipeline).exec();
		ordersAnalytics = ordersAnalytics.pop();

		//Get all the products sold for the day
		//Change the existing pipeline FROM remove group by userId and display TO group by product and display
		pipeline.pop();
		pipeline.pop();

		const computeTotalProductStage = {
			$group: {
				_id: "$products.code",
				code: {
					$first: "$products.code",
				},
			},
		};
		pipeline.push(computeTotalProductStage);

		const countProductStage = {
			$count: "code",
		};
		pipeline.push(countProductStage);

		productsCount = await Order.aggregate(pipeline).exec();
		productsCount =
			productsCount && productsCount.length
				? productsCount.pop().code
				: 0;

		//Get the purchase returns for all purchase returns within a day range
		pipeline = [];

		const matchPrtDayRangeStage = {
			$match: {
				createdDate: {
					$gte: new Date(dateToday.toISOString()),
					$lt: new Date(dateTomorrow.toISOString()),
				},
				userId: mongoose.Types.ObjectId(req.userData.userId),
			},
		};
		pipeline.push(matchPrtDayRangeStage);

		const unwindPrtProducts = {
			$unwind: {
				path: "$returnedProducts",
				preserveNullAndEmptyArrays: true,
			},
		};
		pipeline.push(unwindPrtProducts);

		const computePrtTotalStage = {
			$group: {
				_id: "$userId",
				totalReturnedPrice: {
					$sum: {
						$multiply: [
							"$returnedProducts.quantity",
							"$returnedProducts.price",
						],
					},
				},
			},
		};
		pipeline.push(computePrtTotalStage);

		purchaseReturnAnalytics = await PurchaseReturn.aggregate(
			pipeline
		).exec();
		purchaseReturnAnalytics = purchaseReturnAnalytics.pop();

		//Get all the products returned for the day
		//Change the existing pipeline FROM remove group by userId TO group by returned product
		pipeline.pop();

		const groupByReturnedProducts = {
			$group: {
				_id: "$products.code",
				code: {
					$first: "$products.code",
				},
			},
		};
		pipeline.push(groupByReturnedProducts);

		const countReturnedProductStage = {
			$count: "code",
		};
		pipeline.push(countReturnedProductStage);

		returnedProductsCount = await PurchaseReturn.aggregate(pipeline).exec();
		returnedProductsCount =
			returnedProductsCount && returnedProductsCount.length
				? returnedProductsCount.pop().code
				: 0;
	} catch (err) {
		return next(
			new HttpError("Cannot retrieve data. Please try again later!", 500)
		);
	}

	res.status(200).json({
		...ordersAnalytics,
		...purchaseReturnAnalytics,
		totalProductSold: productsCount,
		totalProductReturned: returnedProductsCount,
	});
};

export const getTopProducts = async (req, res, next) => {
	let topProducts;

	try {
		const pipeline = [];

		//Get day today
		const { dateToday, dateTomorrow } = getDateConfig();

		const matchedProductsStage = {
			$match: {
				createdDate: {
					$gte: new Date(dateToday.toISOString()),
					$lt: new Date(dateTomorrow.toISOString()),
				},
				isActive: true,
				status: "SUBMIT",
				userId: mongoose.Types.ObjectId(req.userData.userId),
			},
		};
		pipeline.push(matchedProductsStage);

		const unwindProductStage = {
			$unwind: {
				path: "$products",
				preserveNullAndEmptyArrays: true,
			},
		};
		pipeline.push(unwindProductStage);

		const groupProductStage = {
			$group: {
				_id: "$products.code",
				name: {
					$first: "$products.name",
				},
				totalQuantitySold: {
					$sum: "$products.quantity",
				},
			},
		};
		pipeline.push(groupProductStage);

		const sortStage = {
			$sort: {
				totalQuantitySold: -1,
			},
		};
		pipeline.push(sortStage);

		const limitStage = {
			$limit: 10,
		};
		pipeline.push(limitStage);

		topProducts = await Order.aggregate(pipeline).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot retrieve top products. Please try again later.",
				500
			)
		);
	}

	res.status(200).json(topProducts);
};

export const getTopCustomers = async (req, res, next) => {
	let topCustomers;

	//Get day today
	const { dateToday, dateTomorrow } = getDateConfig();

	try {
		const pipeline = [];

		const matchOrdersStage = {
			$match: {
				createdDate: {
					$gte: new Date(dateToday.toISOString()),
					$lt: new Date(dateTomorrow.toISOString()),
				},
				isActive: true,
				status: "SUBMIT",
				userId: mongoose.Types.ObjectId(req.userData.userId),
			},
		};
		pipeline.push(matchOrdersStage);

		const groupByCustomerStage = {
			$group: {
				_id: "$customer",
				ordersCount: {
					$sum: 1,
				},
			},
		};
		pipeline.push(groupByCustomerStage);

		const lookupCustomerStage = {
			$lookup: {
				from: "customers",
				localField: "_id",
				foreignField: "_id",
				as: "customer",
			},
		};
		pipeline.push(lookupCustomerStage);

		const unwindCustomerStage = {
			$unwind: "$customer",
		};
		pipeline.push(unwindCustomerStage);

		const displayStage = {
			$project: {
				customer: {
					customerNo: "$customer.customerNo",
					firstName: "$customer.firstName",
					lastName: "$customer.lastName",
				},
				ordersCount: 1,
			},
		};
		pipeline.push(displayStage);

		const sortStage = {
			$sort: {
				ordersCount: -1,
			},
		};
		pipeline.push(sortStage);

		const limitStage = {
			$limit: 10,
		};
		pipeline.push(limitStage);

		topCustomers = await Order.aggregate(pipeline).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot retrieve top customers. Please try again later.",
				500
			)
		);
	}

	res.status(200).json(topCustomers);
};
