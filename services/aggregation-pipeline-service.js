export const matchStage = (params) => {
	return {
		$match: params,
	};
};

export const projectStage = (params) => {
	return {
		$project: params,
	};
};

export const paginationStage = (page, limit) => {
	if (typeof page !== "number") {
		page = 1;
	}

	return {
		$skip: (parseInt(page) - 1) * parseInt(limit),
	};
};

export const limitStage = (limit) => {
	if (typeof page !== "number") {
		limit = 10;
	}

	return {
		$limit: parseInt(limit),
	};
};

export const orOperator = (conditions) => {
	return {
		$or: conditions,
	};
};
