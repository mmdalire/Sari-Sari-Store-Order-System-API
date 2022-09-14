export const matchStage = (params) => {
	return {
		$match: params,
	};
};

export const unwindStage = (params) => {
	return {
		$unwind: params,
	};
};

export const groupStage = (params) => {
	return {
		$group: params,
	};
};

export const projectStage = (params) => {
	return {
		$project: params,
	};
};

export const countStage = (params) => {
	return {
		$count: params,
	};
};

export const paginationStage = (page, limit) => {
	return {
		$skip: (parseInt(page) - 1) * parseInt(limit),
	};
};

export const sortStage = (params) => {
	return {
		$sort: params,
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
