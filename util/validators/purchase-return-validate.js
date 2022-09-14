import Joi from "joi";

import { reformatJoiError } from "../util.js";

export const purchaseReturnValidation = (data) => {
	const templateSchema = {
		order: Joi.string().required(),
		returnedProducts: Joi.array()
			.min(1)
			.unique((a, b) => a.code === b.code)
			.items(
				Joi.object({
					code: Joi.string().required(),
					name: Joi.string().required(),
					quantity: Joi.number().greater(0).required(),
					price: Joi.number().greater(0).required(),
				})
			)
			.required(),
		reason: Joi.string().allow(""),
		userId: Joi.string().required(),
	};

	const schema = Joi.object(templateSchema);
	const { error } = schema.validate(data);

	if (error) {
		return reformatJoiError(error);
	}
	return;
};
