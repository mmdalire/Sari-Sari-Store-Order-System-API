import mongoose from "mongoose";

import HttpError from "../model/http-error.js";
import Order from "../model/order-model.js";
import Product from "../model/product-model.js";

import { orderValidation } from "../util/order-validate.js";
import { generateNumber, makeUppercaseInArray } from "../util/util.js";

//Check if the ordered quantity in each product is greater than the stock quantity
const validateOrderQuantity = (enteredProducts, verifiedProducts) => {
	let index;
	const isQtyExceeded = !enteredProducts.every((eProduct) => {
		index = verifiedProducts.findIndex(
			(vProduct) => vProduct.code === eProduct.code
		);

		return eProduct.quantity <= verifiedProducts[index].quantity;
	});

	if (isQtyExceeded) {
		return verifiedProducts[index].code;
	}
};

export const createOrder = async (req, res, next) => {
	const productCodes = [];
	let verifiedProducts;

	//Server validation
	const error = orderValidation(req.body);
	if (error) {
		return next(new HttpError(error, 422));
	}

	//Product validation where each entered product should exists in the products collection
	req.body.products.forEach((product) => productCodes.push(product.code));

	try {
		verifiedProducts = await Product.find({
			isActive: true,
			userId: req.userData.userId,
			code: { $in: productCodes },
		}).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot create order information. Please try again later!",
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

	//Check if the order quantity is greater than the stock quantity
	const exceededCode = validateOrderQuantity(
		req.body.products,
		verifiedProducts
	);

	if (exceededCode) {
		return next(
			new HttpError(
				`The order quantity for ${exceededCode} has exceeded its stock quantity.`,
				422
			)
		);
	}

	//Check if the credit is greater than the total amount purchased
	const totalAmount = req.body.products.reduce((total, currentProduct) => {
		return total + currentProduct.quantity * currentProduct.price;
	}, 0);

	if (req.body.credit > totalAmount) {
		return next(
			new HttpError(
				"The credit entered exceeds the total purchase amount!",
				422
			)
		);
	}

	//Get the latest PO number entry
	let order;
	try {
		order = await Order.findOne({ userId: req.userData.userId })
			.sort({ createdDate: -1 })
			.limit(1)
			.exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot create order information. Please try again later!",
				500
			)
		);
	}

	//Generate order number
	const poNumber = order
		? generateNumber("po", order.poNo)
		: generateNumber("po");

	//Save order information
	order = new Order({
		poNo: poNumber,
		customer: req.body.customer.trim(),
		products: makeUppercaseInArray(req.body.products),
		credit: req.body.credit,
		status: req.body.status.trim().toUpperCase(),
		userId: req.userData.userId,
	});

	try {
		await order.save();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot create order information. Try again later!",
				500
			)
		);
	}

	//Update the stock quantity once the order is in SUBMITTED status
	if (req.body.status.trim().toUpperCase() === "SUBMIT") {
		try {
			for (let i = 0; i < req.body.products.length; i++) {
				await Product.updateOne(
					{ code: req.body.products[i].code },
					{ $inc: { quantity: -req.body.products[i].quantity } }
				);
			}
		} catch (err) {
			return next(
				new HttpError(
					"Cannot create order information. Try again later!",
					500
				)
			);
		}
	}

	res.status(201).json(order);
};

export const getAllOrders = async (req, res, next) => {
	//Server pagination and filtering
	const { limit = 10, page = 1, search = "" } = req.query;
	let orders;

	try {
		const pipeline = [];

		//Aggregation pipeline stages
		const isActiveStage = {
			$match: {
				isActive: true,
			},
		};
		pipeline.push(isActiveStage);

		const unwindProductStage = {
			$unwind: "$products",
		};
		pipeline.push(unwindProductStage);

		const groupByPoNoStage = {
			$group: {
				_id: "$_id",
				poNo: {
					$first: "$poNo",
				},
				status: {
					$first: "$status",
				},
				credit: {
					$first: "$credit",
				},
				customer: {
					$first: "$customer",
				},
				totalPrice: {
					$sum: {
						$multiply: ["$products.price", "$products.quantity"],
					},
				},
				totalCost: {
					$sum: {
						$multiply: ["$products.cost", "$products.quantity"],
					},
				},
				totalProducts: {
					$sum: 1,
				},
				createdDate: {
					$first: "$createdDate",
				},
			},
		};
		pipeline.push(groupByPoNoStage);

		const lookupCustomerStage = {
			$lookup: {
				from: "customers",
				localField: "customer",
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
				_id: 1,
				poNo: 1,
				customer: {
					lastName: "$customer.lastName",
					firstName: "$customer.firstName",
				},
				totalPrice: 1,
				totalCost: 1,
				totalProducts: 1,
				credit: 1,
				status: 1,
				createdDate: { $toDate: "$createdDate" },
			},
		};
		pipeline.push(displayStage);

		if (search) {
			const searchStage = {
				$match: {
					$or: [
						{ poNo: new RegExp(`${search.toUpperCase()}`) },
						{
							"customer.firstName": new RegExp(
								`${search.toUpperCase()}`
							),
						},
						{
							"customer.lastName": new RegExp(
								`${search.toUpperCase()}`
							),
						},
					],
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

		//Apply the aggregation pipeline
		orders = await Order.aggregate(pipeline);
	} catch (err) {
		return next(
			new HttpError(
				"Cannot retrieve orders. Please try again later!",
				500
			)
		);
	}

	res.status(200).json(orders);
};

export const getOrder = async (req, res, next) => {
	const orderId = req.params.orderId;
	let order;

	try {
		order = await Order.findById(orderId).exec();
	} catch (err) {
		return next(
			new HttpError("Cannot find this order. Please try again!", 404)
		);
	}

	res.status(200).json(order);
};

export const editOrder = async (req, res, next) => {
	const orderId = req.params.orderId;
	const productCodes = [];
	let verifiedProducts;

	//Server validation
	const error = orderValidation(req.body, "update");
	if (error) {
		return next(new HttpError(error, 422));
	}

	//Disallow update of status once the order is SUBMITTED
	let currentOrder;
	try {
		currentOrder = await Order.findById(orderId).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot update this order. Please try again later!",
				500
			)
		);
	}

	if (
		currentOrder.status === "SUBMIT" &&
		req.body.status.toUpperCase() === "DRAFT"
	) {
		return next(
			new HttpError(
				"Cannot update the status of an order once the order is submitted!",
				422
			)
		);
	}

	//Check if the credit is greater than the total amount purchased
	const totalAmount = currentOrder.products.reduce(
		(total, currentProduct) => {
			return total + currentProduct.quantity * currentProduct.price;
		},
		0
	);

	if (req.body.credit > totalAmount) {
		return next(
			new HttpError(
				"The credit entered exceeds the total purchase amount!",
				422
			)
		);
	}

	//If there are any products sent in updating a SUBMITTED order (only updating of credit is allowed), clear the products
	if (
		currentOrder.status === "SUBMIT" &&
		req.body.status.toUpperCase() === "SUBMIT"
	) {
		delete req.body.products;
	}

	//Perform product existense and product stock validation once the status is updated from DRAFT to SUBMIT
	if (
		currentOrder.status === "DRAFT" &&
		req.body.status.toUpperCase() === "SUBMIT"
	) {
		//Product validation where each entered product should exists in the products collection
		req.body.products.forEach((product) => productCodes.push(product.code));

		try {
			verifiedProducts = await Product.find({
				isActive: true,
				userId: req.userData.userId,
				code: { $in: productCodes },
			}).exec();
		} catch (err) {
			return next(
				new HttpError(
					"Cannot update order information. Please try again later!",
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

		//Check if the order quantity is greater than the stock quantity
		const exceededCode = validateOrderQuantity(
			req.body.products,
			verifiedProducts
		);

		if (exceededCode) {
			return next(
				new HttpError(
					`The order quantity for ${exceededCode} has exceeded its stock quantity.`,
					422
				)
			);
		}
	}

	//Update order information
	req.body.customer = req.body.customer.trim();

	if (currentOrder.status === "DRAFT") {
		req.body.products = makeUppercaseInArray(req.body.products);
	}

	req.body.status = req.body.status.trim().toUpperCase();
	req.body.updatedDate = Date.now();

	try {
		await Order.updateOne(
			{
				_id: mongoose.Types.ObjectId(orderId),
			},
			{
				$set: req.body,
			}
		);
	} catch (err) {
		return next(
			new HttpError(
				"Cannot update order information. Try again later!",
				500
			)
		);
	}

	//Update the stock quantity once the order is updated from DRAFT to SUBMIT status
	if (
		currentOrder.status === "DRAFT" &&
		req.body.status.trim().toUpperCase() === "SUBMIT"
	) {
		try {
			for (let i = 0; i < req.body.products.length; i++) {
				await Product.updateOne(
					{ code: req.body.products[i].code },
					{ $inc: { quantity: -req.body.products[i].quantity } }
				);
			}
		} catch (err) {
			return next(
				new HttpError(
					"Cannot update order information. Try again later!",
					500
				)
			);
		}
	}

	res.status(201).json({ message: "Successfully updated order!" });
};

export const cancelOrder = async (req, res, next) => {
	const orderId = req.params.orderId;
	let order;

	//If the status is SUBMIT, cancel is NOT allowed
	try {
		order = await Order.findById(orderId).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot cancel this order. Please try again later!",
				500
			)
		);
	}

	if (order.status === "SUBMIT") {
		return next(
			new HttpError(
				"Cancellation of a submitted order is not allowed!",
				422
			)
		);
	}

	//Cancel order if the status is DRAFT
	try {
		await Order.updateOne(
			{
				_id: mongoose.Types.ObjectId(orderId),
			},
			{
				$set: {
					isActive: false,
					deactivatedDate: Date.now(),
				},
			}
		).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot cancel this order. Please try again later!",
				500
			)
		);
	}

	res.status(200).json({ message: "Cancellation of order successful!" });
};
