import Joi from "joi";

import { reformatJoiError } from "./util.js";

export const customerValidation = (data) => {
	const templateSchema = {
		firstName: Joi.string().required(),
		lastName: Joi.string().required(),
		middleInitial: Joi.string().allow(""),
		email: Joi.string().required().email(),
		phoneNumber: Joi.string().required(),
		birthdate: Joi.date().required(),
		address: Joi.required(),
		userId: Joi.string().required(),
	};

	const schema = Joi.object(templateSchema);
	const { error } = schema.validate(data);

	if (error) {
		return reformatJoiError(error);
	}
	return;
};
