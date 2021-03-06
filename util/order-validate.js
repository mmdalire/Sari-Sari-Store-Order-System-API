import Joi from "joi";

import { reformatJoiError } from "./util.js";

export const orderValidation = (data, type = "create") => {
	const templateSchema = {
		customer: Joi.string().required(),
		credit: Joi.number().allow(""),
		status: Joi.string().required(),
		remarks: Joi.string().allow(""),
		userId: Joi.string().required(),
	};

	if (type === "create") {
		templateSchema.products = Joi.array()
			.min(1)
			.unique((a, b) => a.code === b.code)
			.items(
				Joi.object({
					code: Joi.string().required(),
					name: Joi.string().required(),
					quantity: Joi.number().min(1).required(),
					price: Joi.number().greater(0).required(),
					cost: Joi.number().greater(0).required(),
				})
			)
			.required();
	} else if (type === "update") {
		templateSchema.products = Joi.allow(null);
	}

	const schema = Joi.object(templateSchema);
	const { error } = schema.validate(data);

	if (error) {
		return reformatJoiError(error);
	}
	return;
};
