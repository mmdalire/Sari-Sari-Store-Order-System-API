import Joi from "joi";

import HttpError from "../../model/http-error.js";

import { reformatJoiError } from "../util.js";

const MIN_PASSWORD_LENGTH = 8;

export const signupValidation = (data) => {
	const schema = Joi.object({
		firstName: Joi.string().required(),
		lastName: Joi.string().required(),
		middleInitial: Joi.string().allow(""),
		email: Joi.string().required().email(),
		gender: Joi.string().valid("female", "male").required(),
		birthdate: Joi.date().required(),
		phoneNumber: Joi.string()
			.pattern(/^[0-9]+$/)
			.required(),
		store: Joi.object({
			name: Joi.string().required(),
			startingDate: Joi.date().required(),
		}),
		address: Joi.object({
			lineNumber: Joi.string().required(),
			barangay: Joi.string().required(),
			city: Joi.string().required(),
			province: Joi.string().required(),
			country: Joi.string().required(),
		}).required(),
		password: Joi.string().min(MIN_PASSWORD_LENGTH).required(),
	});

	const { error } = schema.validate(data);

	if (error) {
		throw new HttpError(reformatJoiError(error), 422);
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
		throw new HttpError(reformatJoiError(error), 422);
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
		throw new HttpError(reformatJoiError(error), 422);
	}

	return;
};
