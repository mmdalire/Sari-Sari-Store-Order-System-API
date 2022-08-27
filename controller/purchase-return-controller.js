import mongoose from "mongoose";

import HttpError from "../model/http-error.js";
import Order from "../model/order-model.js";
import Product from "../model/product-model.js";
import PurchaseReturn from "../model/purchase-return-model.js";
import { purchaseReturnValidation } from "../util/purchase-return-validate.js";
import { generateNumber, makeUppercase } from "../util/util.js";

//Check if the returned quantity in each product is greater than the order quantity
const validateReturnQuantity = (
	enteredProducts,
	verifiedProducts,
	verifiedReturnedProducts = []
) => {
	let indexVerifiedProducts;
	let isQtyExceeded = false;
	let productExceeded;

	for (let i = 0; i < enteredProducts.length; i++) {
		indexVerifiedProducts = verifiedProducts.findIndex(
			(vProduct) => vProduct.code === enteredProducts[i].code
		);

		//If there are returned products on a PO, check if the requested returned quantity is greater than the ordered quantity MINUS the existing returned quantity for that product
		if (verifiedReturnedProducts.length > 0) {
			const returnedProduct = verifiedReturnedProducts.filter(
				(rProduct) => rProduct.code === enteredProducts[i].code
			);
			const returnedProductTotal = returnedProduct.reduce(
				(total, rProduct) => total + rProduct.quantity,
				0
			);

			if (
				enteredProducts[i].quantity >
				verifiedProducts[indexVerifiedProducts].quantity -
					returnedProductTotal
			) {
				isQtyExceeded = true;
				productExceeded = enteredProducts[i].code;
				break;
			}
		}
		//If there are NO returned products, check if the requested returned quantity is greater than the ordered quantity
		else {
			if (
				enteredProducts[i].quantity >
				verifiedProducts[indexVerifiedProducts].quantity
			) {
				isQtyExceeded = true;
				productExceeded = enteredProducts[i].code;
				break;
			}
		}
	}

	if (isQtyExceeded) {
		return productExceeded;
	}
};

//Change the appropriate amount of credit whenever a returned product/s is/are involved
const changeCredit = (
	credit,
	verifiedProducts,
	verifiedReturnedProducts = [],
	enteredProducts
) => {
	const totalVerifiedProducts = verifiedProducts.reduce(
		(total, vProducts) => total + vProducts.quantity * vProducts.price,
		0
	);
	const totalVerifiedReturnedProducts = verifiedReturnedProducts.reduce(
		(total, rProducts) => total + rProducts.quantity * rProducts.price,
		0
	);
	const totalEnteredProducts = enteredProducts.reduce(
		(total, eProducts) => total + eProducts.quantity * eProducts.price,
		0
	);

	//Return the new total as new credit
	if (
		credit >
		totalVerifiedProducts -
			totalVerifiedReturnedProducts -
			totalEnteredProducts
	) {
		return (
			totalVerifiedProducts -
			totalVerifiedReturnedProducts -
			totalEnteredProducts
		);
	}
	return credit;
};

export const createPurchaseReturn = async (req, res, next) => {
	const productCodes = [];
	const pipeline = [];
	let verifiedProducts;
	let order;
	let purchaseReturn;

	//Server validation
	const error = purchaseReturnValidation(req.body);
	if (error) {
		return next(new HttpError(error, 422));
	}

	//Check if the order exists
	try {
		const findOrderStage = {
			$match: {
				poNo: req.body.order,
				userId: mongoose.Types.ObjectId(req.userData.userId),
			},
		};
		pipeline.push(findOrderStage);

		const lookupPurchaseReturnStage = {
			$lookup: {
				from: "purchase_returns",
				localField: "prtIds",
				foreignField: "_id",
				as: "purchase_returns",
			},
		};
		pipeline.push(lookupPurchaseReturnStage);

		const unwindReturnedProductsStage = {
			$unwind: {
				path: "$purchase_returns",
				preserveNullAndEmptyArrays: true,
			},
		};
		pipeline.push(unwindReturnedProductsStage);

		const groupByOrderStage = {
			$group: {
				_id: "$_id",
				poNo: {
					$first: "$poNo",
				},
				products: {
					$first: "$products",
				},
				credit: {
					$first: "$credit",
				},
				status: {
					$first: "$status",
				},
				returnedProducts: {
					$push: "$purchase_returns.returnedProducts",
				},
			},
		};
		pipeline.push(groupByOrderStage);

		const flattenReturnProductsStage = {
			$unwind: {
				path: "$returnedProducts",
				preserveNullAndEmptyArrays: true,
			},
		};

		//Apply flattening of arrays TWICE since returned products id deeply nested
		pipeline.push(flattenReturnProductsStage);
		pipeline.push(flattenReturnProductsStage);

		//Group it again for combining of multiple purchase returns into a single document
		const groupByOrderAgainStage = {
			$group: {
				_id: "$_id",
				poNo: {
					$first: "$poNo",
				},
				products: {
					$first: "$products",
				},
				credit: {
					$first: "$credit",
				},
				status: {
					$first: "$status",
				},
				returnedProducts: {
					$push: "$returnedProducts",
				},
			},
		};
		pipeline.push(groupByOrderAgainStage);

		order = await Order.aggregate(pipeline);
		order = order.pop(); //This is in array by default, get ONLY the first element
	} catch (err) {
		return next(
			new HttpError(
				"Cannot create purchase return. Please try again later!",
				500
			)
		);
	}

	if (order) {
		//If the order is either DRAFTED or CANCELLED, purchase return is NOT allowed
		//Purchase return is allowed ONLY for SUBMITTED orders
		if (order.status === "DRAFT" || order.status === "CANCELLED") {
			return next(
				new HttpError(
					"You cannot create purchase return on a drafted or cancelled orders!",
					422
				)
			);
		}
	} else {
		return next(new HttpError("Order does not exists!", 422));
	}

	//Product validation where each entered product should exists in the products collection
	req.body.returnedProducts.forEach((product) =>
		productCodes.push(product.code)
	);

	try {
		verifiedProducts = await Product.find({
			isActive: true,
			userId: req.userData.userId,
			code: { $in: productCodes },
		}).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot create purchase return. Please try again later!",
				500
			)
		);
	}

	if (verifiedProducts.length !== productCodes.length) {
		return next(
			new HttpError(
				"Some products entered have not been created yet!",
				422
			)
		);
	}

	//Product validation where returned quantity shouldn't exceed the original purchased quantity
	const exceededCode = validateReturnQuantity(
		req.body.returnedProducts,
		order.products,
		order.returnedProducts
	);

	if (exceededCode) {
		return next(
			new HttpError(
				`The return quantity for ${exceededCode} has exceeded its order quantity.`,
				422
			)
		);
	}

	//Get the latest PRT number
	try {
		purchaseReturn = await PurchaseReturn.findOne({
			userId: req.userData.userId,
		})
			.sort({ createdDate: -1 })
			.limit(1)
			.exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot create purchase return. Please try again later!",
				500
			)
		);
	}

	//Generate PRT Number
	const prtNumber = purchaseReturn
		? generateNumber("prt", purchaseReturn.prtNo)
		: generateNumber("prt");

	//Save purchase return
	purchaseReturn = new PurchaseReturn({
		prtNo: prtNumber,
		order: order._id,
		returnedProducts: makeUppercase(req.body.returnedProducts),
		reason: req.body.reason.trim(),
		userId: req.userData.userId,
	});

	try {
		await purchaseReturn.save();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot create purchase return. Please try again later!",
				500
			)
		);
	}

	//Update the prtIds field in orders
	try {
		await Order.updateOne(
			{
				_id: mongoose.Types.ObjectId(order._id),
				userId: mongoose.Types.ObjectId(req.userData.userId),
			},
			{
				$push: {
					prtIds: mongoose.Types.ObjectId(purchaseReturn._id),
				},
			}
		).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot create purchase return. Please try again later!",
				500
			)
		);
	}

	//Update the stock quantity once the purchase return is created
	try {
		for (let i = 0; i < req.body.returnedProducts.length; i++) {
			await Product.updateOne(
				{
					code: req.body.returnedProducts[i].code.toUpperCase(),
					userId: req.userData.userId,
				},
				{
					$inc: {
						quantity: parseInt(
							req.body.returnedProducts[i].quantity
						),
					},
				}
			).exec();
		}
	} catch (err) {
		return next(
			new HttpError(
				"Cannot create purchase return. Please try again later!",
				500
			)
		);
	}

	//Update credits (if any) in orders
	//If the credit of an order is GREATER than the new total (order total - returned total), change the credit to be EQUAL to new total
	//Leaving the credit to be as is can be difficult on later process since it should NEVER be greater than the TOTAL (with or without returns)
	if (order.credit > 0) {
		const newCredit = changeCredit(
			order.credit,
			order.products,
			order.returnedProducts,
			purchaseReturn.returnedProducts
		);

		try {
			await Order.updateOne(
				{
					poNo: order.poNo,
				},
				{
					$set: {
						credit: newCredit,
					},
				}
			).exec();
		} catch (err) {
			return next(
				new HttpError(
					"Cannot create purchase return. Please try again later!",
					500
				)
			);
		}
	}

	res.status(201).json(purchaseReturn);
};

export const getAllPurchaseReturns = async (req, res, next) => {
	//Server pagination and filter
	const {
		limit = 10,
		page = 1,
		search = "",
		sort = "createddate",
		order = "desc",
	} = req.query;
	let purchaseReturns;
	const sortParams = () => {
		switch (sort) {
			case "createddate":
				return "createdDate";
			case "prtno":
				return "prtNo";
			case "pono":
				return "poNo";
			case "returnedtotalprice":
				return "returnedTotalPrice";
			case "returnedtotalquantity":
				return "returnedTotalQuantity";
		}
	};
	const orderParams = () => {
		return order === "desc" ? -1 : 1;
	};
	const pipeline = [];

	try {
		//Aggregate pipeline stages
		const ownPurchaseReturnStage = {
			$match: {
				userId: mongoose.Types.ObjectId(req.userData.userId),
			},
		};
		pipeline.push(ownPurchaseReturnStage);

		const unwindReturnedProductStage = {
			$unwind: "$returnedProducts",
		};
		pipeline.push(unwindReturnedProductStage);

		const lookupOrdersStage = {
			$lookup: {
				from: "orders",
				localField: "order",
				foreignField: "_id",
				as: "order",
			},
		};
		pipeline.push(lookupOrdersStage);

		const unwindPoNoStage = {
			$unwind: "$order",
		};
		pipeline.push(unwindPoNoStage);

		const groupByPrtNoStage = {
			$group: {
				_id: "$_id",
				prtNo: {
					$first: "$prtNo",
				},
				poNo: {
					$first: "$order.poNo",
				},
				returnedTotalPrice: {
					$sum: {
						$multiply: [
							"$returnedProducts.quantity",
							"$returnedProducts.price",
						],
					},
				},
				returnedTotalQuantity: {
					$sum: "$returnedProducts.quantity",
				},
				createdDate: {
					$first: "$createdDate",
				},
			},
		};
		pipeline.push(groupByPrtNoStage);

		if (search) {
			const searchStage = {
				$match: {
					$or: [
						{ prtNo: new RegExp(`${search.toUpperCase()}`) },
						{ poNo: new RegExp(`${search.toUpperCase()}`) },
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

		purchaseReturns = await PurchaseReturn.aggregate(pipeline).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot retrieve purchase returns. Please try again later.",
				500
			)
		);
	}

	//Retrieve total count
	let purchaseReturnCount;
	try {
		pipeline.splice(-3); //Remove last three stages for counting of documents (sort, limit, and skip)

		const countStage = {
			$count: "prtNo",
		};
		pipeline.push(countStage);

		//Apply the aggregation pipeline
		purchaseReturnCount = await PurchaseReturn.aggregate(pipeline).exec();

		purchaseReturnCount =
			purchaseReturnCount && purchaseReturnCount.length
				? purchaseReturnCount.pop().prtNo
				: 0;
	} catch (err) {
		return next(
			new HttpError(
				"Cannot retrieve purchase returns. Please try again later!",
				500
			)
		);
	}

	res.status(200).json({ data: purchaseReturns, count: purchaseReturnCount });
};

export const getPurchaseReturn = async (req, res, next) => {
	const purchaseReturnId = req.params.purchaseReturnId;
	let purchaseReturn;

	try {
		const pipeline = [];

		const matchPurchaseReturnStage = {
			$match: {
				_id: mongoose.Types.ObjectId(purchaseReturnId),
			},
		};
		pipeline.push(matchPurchaseReturnStage);

		const lookupOrderStage = {
			$lookup: {
				from: "orders",
				localField: "order",
				foreignField: "_id",
				as: "orderReference",
			},
		};
		pipeline.push(lookupOrderStage);

		const unwindOrder = {
			$unwind: "$orderReference",
		};
		pipeline.push(unwindOrder);

		const displayStage = {
			$project: {
				_id: 1,
				prtNo: 1,
				orderNo: "$orderReference.poNo",
				returnedProducts: 1,
				reason: 1,
				userId: 1,
				createdDate: 1,
			},
		};
		pipeline.push(displayStage);

		//Apply aggregation pipeline
		purchaseReturn = await PurchaseReturn.aggregate(pipeline);

		if (purchaseReturn) {
			purchaseReturn = purchaseReturn.pop();
		}
	} catch (err) {
		return next(
			new HttpError(
				"Cannot find this purchase return. Please try again later!",
				500
			)
		);
	}

	res.status(200).json(purchaseReturn);
};

export const getPurchaseReturnByOrder = async (req, res, next) => {
	const orderNo = req.params.orderNo.toUpperCase();
	const totalReturnedProducts = {};
	let order;
	let existedPrts;

	const getValueFromObject = (obj, prop) => {
		return obj[prop];
	};

	//Get the order reference
	try {
		order = await Order.findOne(
			{
				poNo: orderNo,
				userId: mongoose.Types.ObjectId(req.userData.userId),
			},
			{
				poNo: 1,
				products: 1,
				status: 1,
			}
		).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot find this order. Please try again later!",
				500
			)
		);
	}

	//Check if the order exists
	if (!order) {
		return next(
			new HttpError(
				"This order does not exists! Please check your order number and try again.",
				400
			)
		);
	}

	//If the order is CANCELLED or DRAFTED, it cannot be used for purchase return
	if (order.status !== "SUBMIT") {
		return next(
			new HttpError(
				"This order is not eligible for purchase return. Please choose orders that are submitted.",
				422
			)
		);
	}

	//Get the existing purchase returns related to that order
	try {
		existedPrts = await PurchaseReturn.find(
			{
				order: mongoose.Types.ObjectId(order._id),
			},
			{
				_id: 0,
				returnedProducts: 1,
			}
		).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot find this order. Please try again later!",
				500
			)
		);
	}

	//Combine all quantities per product in all existing orders related to it
	for (let i = 0; i < existedPrts.length; i++) {
		//Check if the product exists already in the total products
		for (let j = 0; j < existedPrts[i].returnedProducts.length; j++) {
			let code = existedPrts[i].returnedProducts[j].code;
			let quantity = existedPrts[i].returnedProducts[j].quantity;

			//If the code doesn't exists yet
			if (!totalReturnedProducts[code]) {
				totalReturnedProducts[code] = quantity;
			} else {
				totalReturnedProducts[code] =
					getValueFromObject(totalReturnedProducts, code) + quantity;
			}
		}
	}

	//Merge the total returned quantity and total ordered quantity per product
	order.products.forEach((oProd) => {
		oProd.quantity = oProd.quantity - totalReturnedProducts[oProd.code];
	});

	res.status(200).json(order);
};
