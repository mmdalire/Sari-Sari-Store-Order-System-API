import bcrypt from "bcryptjs";

import HttpError from "../model/http-error.js";

export const encryptPassword = async (password) => {
	let hashedPassword;
	const salt = 12;
	try {
		hashedPassword = await bcrypt.hash(password, salt);
	} catch (err) {
		throw new HttpError("Something went wrong. Please try again", 500);
	}
	return hashedPassword;
};

export const comparePassword = async (actualPassword, expectedPassword) => {
	let isValidPassword = false;
	try {
		isValidPassword = await bcrypt.compare(
			actualPassword,
			expectedPassword
		);

		if (!isValidPassword) {
			throw new HttpError(
				"Incorrect username or password. Please try again",
				400
			);
		}
	} catch (err) {
		throw err;
	}

	return isValidPassword;
};
