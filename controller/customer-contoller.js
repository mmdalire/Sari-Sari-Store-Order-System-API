import mongoose from "mongoose";

import HttpError from "../model/http-error.js";
import Customer from "../model/customer-model.js";
import Order from "../model/order-model.js";
import { customerValidation } from "../util/validators/customer-validate.js";
import { generateNumber } from "../util/util.js";
import {
	countStage,
	groupStage,
	limitStage,
	matchStage,
	paginationStage,
	projectStage,
	sortStage,
} from "../util/mongodb-util.js";

const isCustomerOwned = async (userId, customerId) => {
	try {
		await Customer.ownershipValidation(userId, customerId);
	} catch (err) {
		throw new HttpError("Unauthorized access!", 401);
	}
};

const retrieveCustomer = async (customerId, errorMessage, errorCode) => {
	let customer;

	try {
		customer = await Customer.findById(customerId).exec();
	} catch (err) {
		throw new HttpError(
			"Cannot retrieve customer! Please try again later!",
			500
		);
	}

	if (!customer) {
		throw new HttpError(errorMessage, errorCode);
	}

	return customer;
};

const getLatestCustomerNumber = async (userId) => {
	let customer;
	try {
		customer = await Customer.findOne({ userId })
			.sort({ createdDate: -1 })
			.limit(1)
			.exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot create customer information. Please try again later!",
				500
			)
		);
	}

	return customer ? customer.customerNo : null;
};

const getCustomerCreditCount = async (findParams) => {
	try {
		const creditCount = await Order.countDocuments(findParams).exec();
		return creditCount;
	} catch (err) {
		throw HttpError(
			"Cannot retrieve customer's credit information. Please try again later!",
			500
		);
	}
};

const getOrderWithCredits = async (
	findParams,
	sortParams,
	orderParams,
	page,
	limit
) => {
	try {
		const ordersWithCredit = await Order.find(findParams, {
			poNo: 1,
			credit: 1,
			createdDate: 1,
		})
			.sort({
				[sortParams]: orderParams,
			})
			.limit(limit)
			.skip((page - 1) * limit)
			.exec();

		return ordersWithCredit;
	} catch (err) {
		throw new HttpError(
			"Cannot retrieve customer's credit information. Try again later!",
			500
		);
	}
};

const checkCustomerBlacklistedStatus = async (
	customerId,
	referenceStatus,
	errorMessage,
	errorCode
) => {
	const customer = await retrieveCustomer(
		customerId,
		"This customer does not exists!",
		404
	);
	if (customer.isBlacklisted && referenceStatus === "BLACKLIST") {
		throw new HttpError(errorMessage, errorCode);
	}

	if (!customer.isBlacklisted && referenceStatus === "REVERSE_BLACKLIST") {
		throw new HttpError(errorMessage, errorCode);
	}
};

const toggleBlacklistStatus = async (
	customerId,
	isBlacklisted,
	errorMessage,
	errorCode
) => {
	try {
		await Customer.updateOne(
			{ _id: mongoose.Types.ObjectId(customerId) },
			{
				$set: {
					isBlacklisted,
					updatedDate: Date.now(),
				},
			}
		).exec();
	} catch (err) {
		throw new HttpError(errorMessage, errorCode);
	}
};

export const createCustomer = async (req, res, next) => {
	try {
		//Server validation
		customerValidation(req.body);

		//Generate customer number
		const customerNumber = generateNumber(
			"customer",
			await getLatestCustomerNumber(req.userData.userId)
		);

		//Save customer information
		const customer = new Customer({
			customerNo: customerNumber,
			storeOwner: req.body.storeOwner,
			firstName: req.body.firstName.trim().toUpperCase(),
			lastName: req.body.lastName.trim().toUpperCase(),
			middleInitial: req.body.middleInitial.trim().toUpperCase(),
			email: req.body.email.trim().toLowerCase(),
			phoneNumber: req.body.phoneNumber.trim(),
			birthdate: req.body.birthdate,
			address: req.body.address.trim(),
			userId: req.userData.userId,
		});

		try {
			await customer.save();
		} catch (err) {
			throw new HttpError(
				"Cannot create customer information. Please try again later!",
				500
			);
		}

		res.status(201).json(customer);
	} catch (err) {
		return next(err);
	}
};

export const getAllCustomers = async (req, res, next) => {
	//Server searching and pagination
	const {
		limit = 10,
		page = 1,
		search = "",
		sort = "createddate",
		order = "desc",
	} = req.query;

	const sortField = {
		createddate: "createdDate",
		updateddate: "updatedDate",
		customerno: "customerNo",
		lastname: "lastName",
		firstname: "firstName",
		isblacklisted: "isBlacklisted",
	};

	const orderField = {
		asc: 1,
		desc: -1,
	};

	//Retrieve all customers
	let customers;
	const pipeline = [];

	try {
		const matchActiveCustomersStage = matchStage({
			storeOwner: mongoose.Types.ObjectId(req.userData.userId),
			isActive: true,
			isBlacklisted: "isBlacklisted" in req.query,
		});
		pipeline.push(matchActiveCustomersStage);

		const displayStage = projectStage({
			customerNo: 1,
			firstName: 1,
			middleInitial: {
				$cond: {
					if: {
						$ne: ["$middleInitial", ""],
					},
					then: "$middleInitial",
					else: "-",
				},
			},
			lastName: 1,
			createdDate: 1,
			status: {
				$cond: {
					if: {
						$eq: ["$isBlacklisted", true],
					},
					then: "BLACKLISTED",
					else: "ACTIVE",
				},
			},
		});
		pipeline.push(displayStage);

		if (search) {
			const searchStage = matchStage({
				$or: [
					{ customerNo: new RegExp(`${search.toUpperCase()}`) },
					{ firstName: new RegExp(`${search.toUpperCase()}`) },
					{ lastName: new RegExp(`${search.toUpperCase()}`) },
					{
						middleInitial: new RegExp(`${search.toUpperCase()}`),
					},
				],
			});
			pipeline.push(searchStage);
		}

		pipeline.push(
			sortStage({
				[sortField[sort]]: orderField[order],
			})
		);
		pipeline.push(paginationStage(page, limit));
		pipeline.push(limitStage(limit));

		//Apply aggregation pipeline
		customers = await Customer.aggregate(pipeline).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot retrieve customers. Please try again later!",
				500
			)
		);
	}

	//Retrieve total count
	const stageRemoveForCount = 3; //Remove last three stages for counting of documents (sort, limit, and skip)
	let customerCount;
	try {
		pipeline.splice(-stageRemoveForCount);
		pipeline.push(countStage("customerNo"));

		//Apply the aggregation pipeline
		customerCount = await Customer.aggregate(pipeline).exec();

		customerCount =
			customerCount && customerCount.length
				? customerCount.pop().customerNo
				: 0;
	} catch (err) {
		return next(
			new HttpError(
				"Cannot retrieve customer. Please try again later!",
				500
			)
		);
	}

	res.status(200).json({ data: customers, count: customerCount });
};

export const getCustomer = async (req, res, next) => {
	const customerId = req.params.customerId;

	try {
		const customer = await retrieveCustomer(customerId);
		res.status(200).json(customer);
	} catch (err) {
		return next(err);
	}
};

export const getCustomerCredits = async (req, res, next) => {
	const customerId = req.params.customerId;

	//Server pagination and filter
	const {
		limit = 10,
		page = 1,
		search = "",
		sort = "createddate",
		order = "desc",
	} = req.query;
	const findParams = {
		credit: {
			$gt: 0,
		},
		isActive: true,
		status: "SUBMIT",
		customer: customerId,
		storeOwner: req.userData.userId,
	};
	const sortField = {
		createddate: "createdDate",
		updateddate: "updatedDate",
		pono: "poNo",
		credit: "credit",
	};
	const orderField = {
		asc: 1,
		desc: -1,
	};

	if (search) {
		findParams.poNo = new RegExp(`${search.toUpperCase()}`);
	}

	try {
		//Get total number of credits of a customer
		const creditCount = await getCustomerCreditCount(findParams);

		//Retrieve orders with credits (paginated)
		const ordersWithCredit = await getOrderWithCredits(
			findParams,
			sortField[sort],
			orderField[order],
			page,
			limit
		);

		//Retrieve total credit amount
		const pipeline = [];

		const activeOrderStage = matchStage({
			credit: {
				$gt: 0,
			},
			isActive: true,
			status: "SUBMIT",
			customer: mongoose.Types.ObjectId(customerId),
			storeOwner: mongoose.Types.ObjectId(req.userData.userId),
		});
		pipeline.push(activeOrderStage);

		const groupByCustomerStage = groupStage({
			_id: "$customer",
			totalCredits: {
				$sum: "$credit",
			},
		});
		pipeline.push(groupByCustomerStage);

		const displayTotalCreditStage = projectStage({
			_id: 0,
			totalCredits: "$totalCredits",
		});
		pipeline.push(displayTotalCreditStage);

		let totalCredits;
		try {
			totalCredits = await Order.aggregate(pipeline);
			totalCredits =
				totalCredits && totalCredits.length
					? totalCredits.pop().totalCredits
					: 0;
		} catch (err) {
			throw new HttpError(
				"Cannot retrieve customer's credit information. Try again later!",
				500
			);
		}

		res.status(200).json({
			orders: ordersWithCredit,
			totalCredits,
			count: creditCount,
		});
	} catch (err) {
		return next(err);
	}
};

export const editCustomer = async (req, res, next) => {
	const customerId = req.params.customerId;

	try {
		//Ownership validation
		await isCustomerOwned(req.userData.userId, customerId);

		//Server side validation
		customerValidation(req.body, "edit");

		//Update customer
		req.body.firstName = req.body.firstName.trim().toUpperCase();
		req.body.lastName = req.body.lastName.trim().toUpperCase();
		req.body.middleInitial = req.body.middleInitial.trim().toUpperCase();
		req.body.email = req.body.email.trim().toLowerCase();
		req.body.updatedDate = Date.now();

		try {
			await Customer.updateOne(
				{ _id: mongoose.Types.ObjectId(customerId) },
				{
					$set: req.body,
				}
			).exec();
		} catch (err) {
			throw new HttpError(
				"Cannot update this customer. Please try again later!",
				500
			);
		}

		res.status(200).json({ message: "Successfully updated customer!" });
	} catch (err) {
		return next(err);
	}
};

export const blacklistCustomer = async (req, res, next) => {
	const customerId = req.params.customerId;

	try {
		//Ownership validation
		await isCustomerOwned(req.userData.userId, customerId);

		//Check if the customer is already in the blacklist
		await checkCustomerBlacklistedStatus(
			customerId,
			"BLACKLIST",
			"This customer is already blacklisted.",
			422
		);

		//Update the blacklist status of the customer
		await toggleBlacklistStatus(
			customerId,
			true,
			"Cannot blacklist this customer. Please try again later!",
			500
		);

		res.status(200).json({ message: "Successfully blacklisted customer!" });
	} catch (err) {
		return next(err);
	}
};

export const reverseBlacklistCustomer = async (req, res, next) => {
	const customerId = req.params.customerId;

	try {
		//Ownership validation
		await isCustomerOwned(req.userData.userId, customerId);

		//Check if the customer is already in the blacklist
		await checkCustomerBlacklistedStatus(
			customerId,
			"REVERSE_BLACKLIST",
			"This customer is already not blacklisted.",
			422
		);

		//Update the blacklist status of the customer
		await toggleBlacklistStatus(
			customerId,
			false,
			"Cannot reverse blacklist this customer. Please try again later!",
			500
		);

		res.status(200).json({
			message: "Successfully reverse blacklisted customer!",
		});
	} catch (err) {
		return next(err);
	}
};

export const deleteCustomer = async (req, res, next) => {
	const customerId = req.params.customerId;

	try {
		//Ownership validation
		await isCustomerOwned(req.userData.userId, customerId);

		//Update the customer to be inactive ONLY (NOT delete)
		try {
			await Customer.updateOne(
				{ _id: mongoose.Types.ObjectId(customerId) },
				{
					$set: {
						isActive: false,
						deactivatedDate: Date.now(),
					},
				}
			).exec();
		} catch (err) {
			throw new HttpError("Cannot delete this customer", 400);
		}

		res.status(200).json({ message: "Successfully deleted customer!" });
	} catch (err) {
		return next(err);
	}
};
