import Joi from "joi";

import { reformatJoiError } from "./util.js";

export const productValidation = (data) => {
	const templateSchema = {
		name: Joi.string().required(),
		category: Joi.string().required(),
		code: Joi.string().required(),
		description: Joi.string().allow(""),
		type: Joi.string().required(),
		unit: Joi.string().allow(""),
		price: Joi.number().greater(0).required(),
		cost: Joi.number().greater(0).required(),
		quantity: Joi.number().greater(0).required(),
		userId: Joi.string().required(),
	};

	const schema = Joi.object(templateSchema);
	const { error } = schema.validate(data);

	if (error) {
		return reformatJoiError(error);
	}
	return;
};
