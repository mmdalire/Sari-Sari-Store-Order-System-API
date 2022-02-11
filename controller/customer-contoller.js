import mongoose from "mongoose";

import HttpError from "../model/http-error.js";
import Customer from "../model/customer-model.js";
import { customerValidation } from "../util/customer-validate.js";
import { generateNumber } from "../util/util.js";

export const createCustomer = async (req, res, next) => {
	//Server side validation
	const error = customerValidation(req.body);
	if (error) {
		return next(new HttpError(error, 422));
	}

	//Getting the latest customer number entry
	let customer;
	try {
		customer = await Customer.findOne({ userId: req.userData.userId })
			.sort({
				createdDate: -1,
			})
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

	//Generate customer number
	const customerNumber = customer
		? generateNumber("customer", customer.customerNo)
		: generateNumber("customer");

	//Save customer information
	customer = new Customer({
		customerNo: customerNumber,
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
		return next(
			new HttpError(
				"Cannot create customer information. Please try again later!",
				500
			)
		);
	}

	res.status(201).json(customer);
};

export const getAllCustomers = async (req, res, next) => {
	//Server searching and pagination
	const { limit = 10, page = 1, search = "" } = req.query;
	const findParameters = { userId: req.userData.userId, isActive: true };

	if (search) {
		findParameters.$or = [
			{ customerNo: new RegExp(`${search.toUpperCase()}`) },
			{ firstName: new RegExp(`${search.toUpperCase()}`) },
			{ lastName: new RegExp(`${search.toUpperCase()}`) },
			{ middleInitial: new RegExp(`${search.toUpperCase()}`) },
		];
	}

	//Filtering
	if ("isBlacklisted" in req.query) {
		findParameters.isBlacklisted = true;
	}

	//Retrieve all customers
	let customers;
	try {
		customers = await Customer.find(findParameters, {
			customerNo: 1,
			firstName: 1,
			middleInitial: 1,
			lastName: 1,
			createdDate: 1,
			isBlacklisted: 1,
		})
			.sort({
				lastName: 1,
			})
			.limit(limit)
			.skip((page - 1) * limit)
			.exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot retrieve customers. Please try again later!",
				500
			)
		);
	}

	res.status(200).json(customers);
};

export const getCustomer = async (req, res, next) => {
	const customerId = req.params.customerId;
	let customer;

	//Retrieve specific customer based on ID
	try {
		customer = await Customer.findById(customerId).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot find this customer. Please try again later!",
				404
			)
		);
	}

	res.status(200).json(customer);
};

export const editCustomer = async (req, res, next) => {
	const customerId = req.params.customerId;

	//Ownership validation
	try {
		await Customer.ownershipValidation(req.userData.userId, customerId);
	} catch (err) {
		return next(new HttpError("Unauthorized access!", 401));
	}

	//Server side validation
	const error = customerValidation(req.body, "update");
	if (error) {
		return next(new HttpError(error, 422));
	}

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
		return next(
			new HttpError(
				"Cannot update this customer. Please try again later!",
				400
			)
		);
	}

	res.status(200).json({ message: "Successfully updated customer!" });
};

export const deleteCustomer = async (req, res, next) => {
	const customerId = req.params.customerId;

	//Ownership validation
	try {
		await Customer.ownershipValidation(req.userData.userId, customerId);
	} catch (err) {
		return next(new HttpError("Unauthorized access!", 401));
	}

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
		return next(new HttpError("Cannot delete this customer", 400));
	}

	res.status(200).json({ message: "Successfully deleted customer!" });
};
