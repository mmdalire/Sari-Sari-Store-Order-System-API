import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

import HttpError from "../model/http-error.js";
import User from "../model/user-model.js";
import { signupValidation, loginValidation } from "../util/user-validate.js";

dotenv.config();

export const signup = async (req, res, next) => {
	//Server side validation
	const error = signupValidation(req.body);
	if (error) {
		return next(new HttpError(error, 422));
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
		firstName: req.body.firstName,
		lastName: req.body.lastName,
		email: req.body.email,
		gender: req.body.gender,
		birthdate: req.body.birthdate,
		phoneNumber: req.body.phoneNumber,
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
		token,
	});
};
