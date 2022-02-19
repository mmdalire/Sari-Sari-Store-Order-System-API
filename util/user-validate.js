import Joi from "joi";

import { reformatJoiError } from "./util.js";

const MIN_PASSWORD_LENGTH = 8;

export const signupValidation = (data) => {
	const schema = Joi.object({
		firstName: Joi.string().required(),
		lastName: Joi.string().required(),
		email: Joi.string().required().email(),
		gender: Joi.string().required(),
		birthdate: Joi.date().required(),
		phoneNumber: Joi.string().required(),
		password: Joi.string().min(MIN_PASSWORD_LENGTH).required(),
	});

	const { error } = schema.validate(data);

	if (error) {
		return reformatJoiError(error);
	}

	return;
};

export const loginValidation = (data) => {
	const schema = Joi.object({
		email: Joi.string().required().email(),
		password: Joi.string().required(),
	});

	const { error } = schema.validate(data);

	if (error) {
		return reformatJoiError(error);
	}

	return;
};

export const passwordValidation = (data) => {
	const schema = Joi.object({
		oldPassword: Joi.string().required(),
		newPassword: Joi.string().min(MIN_PASSWORD_LENGTH).required(),
	});

	const { error } = schema.validate(data);

	if (error) {
		return reformatJoiError(error);
	}

	return;
};
