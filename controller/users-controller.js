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

dotenv.config();

export const signup = async (req, res, next) => {
	//Server side validation
	const error = signupValidation(req.body);
	if (error) {
		return next(new HttpError(error, 422));
	}

	//Check if the emails exists
	let emailExists;
	try {
		emailExists = await User.findOne({ email: req.body.email }).exec();
	} catch (err) {
		return next(new Error("Cannot create user! Please try again!", 500));
	}

	if (emailExists) {
		return next(
			new Error(
				"An account with this email already exists! Choose a different email address!",
				400
			)
		);
	}

	//Encrypt password
	let hashedPassword;
	const salt = 12;
	try {
		hashedPassword = await bcrypt.hash(req.body.password, salt);
	} catch (err) {
		return next(
			new HttpError("Cannot create user! Please try again!", 500)
		);
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
		password: hashedPassword,
	});

	try {
		await user.save();
	} catch (err) {
		return res
			.status(500)
			.json({ message: "Signing up failed! Please try again later!" });
	}

	return res.status(201).json({
		userId: user.id,
	});
};

export const login = async (req, res, next) => {
	//Server side validation
	const error = loginValidation(req.body);
	let existingUser;
	if (error) {
		return next(new HttpError(error, 422));
	}

	//Find if the user exists
	try {
		existingUser = await User.findOne({ email: req.body.email }).exec();
	} catch (err) {
		return next(
			new HttpError("Logging in failed! Please try again later!", 500)
		);
	}

	if (!existingUser) {
		return next(
			new HttpError(
				"Incorrect credentials! Please check and try again!",
				401
			)
		);
	}

	//Check if the password is valid
	let isValidPassword = false;
	try {
		isValidPassword = await bcrypt.compare(
			req.body.password,
			existingUser.password
		);
	} catch (err) {
		return next(
			new HttpError("Logging in failed! Please try again later!", 500)
		);
	}

	if (!isValidPassword) {
		return next(
			new HttpError(
				"Incorrect credentials! Please check and try again!",
				401
			)
		);
	}

	//Create JSON web token
	let token;
	try {
		token = jwt.sign(
			{
				userId: existingUser.id,
			},
			process.env.JSON_SECRET_KEY
		);
	} catch (err) {
		return next(
			new HttpError("Logging in failed! Please try again later!", 500)
		);
	}

	return res.status(201).json({
		userId: existingUser.id,
		firstName: existingUser.firstName,
		lastName: existingUser.lastName,
		token,
	});
};

export const changePassword = async (req, res, next) => {
	//Server side validation
	const error = passwordValidation(req.body);
	let user;
	if (error) {
		return next(new HttpError(error, 422));
	}

	//Find if the user exists
	try {
		user = await User.findById(req.userData.userId).exec();
	} catch (err) {
		return next(
			new HttpError(
				"Cannot change password. Please try again later!",
				500
			)
		);
	}

	if (!user) {
		return next(
			new HttpError(
				"This user does not exists. Please enter the right credentials",
				404
			)
		);
	}

	//Check if the old password is valid
	let isValidPassword = false;
	try {
		isValidPassword = await bcrypt.compare(
			req.body.oldPassword,
			user.password
		);
	} catch (err) {
		return next(
			new HttpError(
				"Cannot change password. Please try again later!",
				500
			)
		);
	}

	if (!isValidPassword) {
		return next(
			new HttpError(
				"Incorrect old password! Please enter correct credentials!",
				401
			)
		);
	}

	//Encrypt password
	let hashedPassword;
	const salt = 12;
	try {
		hashedPassword = await bcrypt.hash(req.body.newPassword, salt);
	} catch (err) {
		return next(
			new HttpError(
				"Cannot change password. Please try again later!",
				500
			)
		);
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
