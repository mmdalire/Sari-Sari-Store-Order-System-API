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
	return {
		$skip: (parseInt(page) - 1) * parseInt(limit),
	};
};

export const limitStage = (limit) => {
	return {
		$limit: parseInt(limit),
	};
};

export const orOperator = (conditions) => {
	return {
		$or: conditions,
	};
};
