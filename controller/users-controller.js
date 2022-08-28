import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import HttpError from "../model/http-error.js";
import User from "../model/user-model.js";
import {
	signupValidation,
	loginValidation,
	passwordValidation,
} from "../util/user-validate.js";
import { makeUppercase } from "../util/util.js";

dotenv.config();

const encryptPassword = async (password) => {
	let hashedPassword;
	const salt = 12;
	try {
		hashedPassword = await bcrypt.hash(password, salt);
	} catch (err) {
		throw new HttpError("Cannot create user! Please try again!", 500);
	}
	return hashedPassword;
};

const comparePassword = async (actualPassword, expectedPassword) => {
	let isValidPassword = false;
	try {
		isValidPassword = await bcrypt.compare(
			actualPassword,
			expectedPassword
		);

		if (!isValidPassword) {
			throw new Error(
				"Incorrect credentials! Please check and try again!",
				401
			);
		}
	} catch (err) {
		if (err.name === "HttpError") {
			throw new HttpError(
				"Logging in failed! Please try again later!",
				500
			);
		}
		throw err;
	}

	return isValidPassword;
};

const createAuthToken = (userId) => {
	let token;
	try {
		token = jwt.sign(
			{
				userId,
			},
			process.env.JSON_SECRET_KEY
		);
	} catch (err) {
		throw new HttpError("Logging in failed! Please try again later!", 500);
	}

	return token;
};

const checkIfEmailExists = async (email, errorMessage, errorCode) => {
	let doesEmailExists;
	try {
		doesEmailExists = await User.findOne({ email }).exec();
	} catch (err) {
		throw new HttpError("Signing up failed! Please try again later!", 500);
	}

	if (doesEmailExists) {
		throw new Error(errorMessage, errorCode);
	}
};

const checkIfStoreExists = async (storeName, errorMessage, errorCode) => {
	let doesStoreNameExists;
	try {
		doesStoreNameExists = await User.findOne({
			"store.name": storeName.toUpperCase(),
		}).exec();
	} catch (err) {
		throw new Error("Signing up failed! Please try again later!", 500);
	}

	if (doesStoreNameExists) {
		throw new Error(errorMessage, errorCode);
	}
};

const retrieveUserIfExists = async (userRef, errorMessage, errorCode) => {
	let user;

	//Check if user exists using email
	try {
		user = await User.findOne({
			email: userRef,
		}).exec();
	} catch (err) {
		throw new HttpError("Signing up failed! Please try again later!", 500);
	}

	if (user) {
		return user;
	}

	//Check if user exists using ID
	try {
		user = await User.findById(userRef).exec();
	} catch (err) {
		throw new HttpError("Signing up failed! Please try again later!", 500);
	}

	if (user) {
		return user;
	}

	throw new Error(errorMessage, errorCode);
};

export const signup = async (req, res, next) => {
	let hashedPassword;
	try {
		//Server side validation
		signupValidation(req.body);

		//Check if the emails exists
		await checkIfEmailExists(
			req.body.email,
			"An account with this email already exists! Choose a different email address!",
			400
		);

		//Check if the store name has already been used
		if (req.body.store) {
			await checkIfStoreExists(
				req.body.store.name,
				"This store name has already been used! Choose a different one!",
				400
			);
		}

		//Encrypt password
		hashedPassword = await encryptPassword(req.body.password);
	} catch (err) {
		return next(err);
	}

	//Save user to db
	const user = new User({
		firstName: req.body.firstName.trim().toUpperCase(),
		lastName: req.body.lastName.trim().toUpperCase(),
		middleInitial: req.body.middleInitial
			? req.body.middleInitial.toUpperCase()
			: "",
		email: req.body.email.trim().toLowerCase(),
		gender: req.body.gender.trim().toLowerCase(),
		birthdate: req.body.birthdate,
		phoneNumber: req.body.phoneNumber.trim(),
		store: makeUppercase(req.body.store),
		address: makeUppercase(req.body.address),
		password: hashedPassword,
	});

	try {
		await user.save();
	} catch (err) {
		return res.status(500).json({
			message: "Signing up failed! Please try again later!",
		});
	}

	return res.status(201).json({
		userId: user.id,
	});
};

export const login = async (req, res, next) => {
	try {
		//Server side validation
		loginValidation(req.body);

		//Check if the user exists
		const { id, password, firstName, lastName } =
			await retrieveUserIfExists(
				req.body.email,
				"Incorrect credentials! Please check and try again!",
				400
			);

		//Check validity of password
		await comparePassword(req.body.password, password);

		//Create authentication token
		const token = createAuthToken(id);

		//Send response
		return res.status(201).json({
			userId: id,
			firstName,
			lastName,
			token,
		});
	} catch (err) {
		return next(err);
	}
};

export const changePassword = async (req, res, next) => {
	let hashedPassword;
	try {
		//Server side validation
		passwordValidation(req.body);

		//Find if the user exists
		const { password } = await retrieveUserIfExists(
			req.userData.userId,
			"Incorrect credentials! Please check and try again!",
			400
		);

		//Check validity of password
		await comparePassword(req.body.oldPassword, password);

		//Encrypt password
		hashedPassword = await encryptPassword(req.body.newPassword);
	} catch (err) {
		return next(err);
	}

	//Save new password
	try {
		await User.updateOne(
			{ _id: mongoose.Types.ObjectId(req.userData.userId) },
			{
				$set: {
					password: hashedPassword,
				},
			}
		);
	} catch (err) {
		return next(
			new HttpError(
				"Cannot change password. Please try again later!",
				500
			)
		);
	}

	res.status(201).json({
		message: "Successfully changed password!",
	});
};
