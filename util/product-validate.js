import Joi from "joi";

import { reformatJoiError } from "./util.js";

export const productValidation = (
	data,
	type = "create",
	allowProductInfoEdit = true
) => {
	const templateSchema = {
		description: Joi.string().allow(""),
		price: Joi.number().greater(0).required(),
		cost: Joi.number().greater(0).required(),
		quantity: Joi.number().greater(0).required(),
		userId: Joi.string().required(),
	};

	if (type === "create" || (type === "update" && allowProductInfoEdit)) {
		templateSchema.name = Joi.string().required();
		templateSchema.category = Joi.string().required();
		templateSchema.code = Joi.string().required();
		templateSchema.type = Joi.string().required();
		templateSchema.unit = Joi.string().allow("");
	} else if (type === "update" && !allowProductInfoEdit) {
		templateSchema.name = Joi.allow(null);
		templateSchema.category = Joi.allow(null);
		templateSchema.code = Joi.allow(null);
		templateSchema.type = Joi.allow(null);
		templateSchema.unit = Joi.string().allow(null);
	}

	const schema = Joi.object(templateSchema);
	const { error } = schema.validate(data);

	if (error) {
		return reformatJoiError(error);
	}
	return;
};

export const restockProductValidation = (data) => {
	const templateSchema = {
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
