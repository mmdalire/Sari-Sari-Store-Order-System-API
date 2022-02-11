import Joi from "joi";

import { reformatJoiError } from "./util.js";

export const categoryValidation = (data, type = "create") => {
	const templateSchema = {
		name: Joi.string().required(),
		userId: Joi.string().required(),
	};

	if (type === "create") {
		templateSchema.code = Joi.string().required();
	}

	const schema = Joi.object(templateSchema);
	const { error } = schema.validate(data);

	if (error) {
		return reformatJoiError(error);
	}
	return;
};
