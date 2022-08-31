const makeAllFieldsUppercase = (data) => {
	const transformedData = {};

	for (let key in data) {
		if (typeof data[key] === "string") {
			transformedData[key] = data[key].trim().toUpperCase();
			continue;
		}
		transformedData[key] = data[key];
	}

	return transformedData;
};

/**
 * @desc Make the first letter of a string to be capitalized
 * @param {string} data - To be capitalized in first letter
 * @returns {string}
 */
export const capitalizeFirst = (data) => {
	return data.charAt(0).toUpperCase() + data.slice(1).toLowerCase();
};

/**
 * @desc Make the contents of an array in uppercase
 * @param {array} data - If array, make all elements in uppercase
 * @returns {array}
 */
export const makeUppercase = (data) => {
	if (data === null) {
		return null;
	}

	//Transform all fields in an array of objects to uppercase
	if (Array.isArray(data)) {
		return data.map((d) => makeAllFieldsUppercase(d));
	}

	//Transform all values in an object to uppercase
	if (typeof data === "object" && data !== null) {
		return makeAllFieldsUppercase(data);
	}
};

/**
 * @desc Reformat JOI errors into more human readable format
 * @param {object} error - The raw error provided by JOI
 * @returns {string}
 */
export const reformatJoiError = (error) => {
	const details = error.details[0];
	const message = details.message.split('"').pop();

	let fieldName;
	//If the error is within an array of objects or the object itself,
	//(indicates the incorrect field in the object)
	if (details.path.length >= 2) {
		fieldName = `${capitalizeFirst(details.path.pop())} in ${
			details.path[0]
		}`;
	} else {
		fieldName = capitalizeFirst(details.path.pop());
	}

	return `'${fieldName}'${message}!`;
};

/**
 * @desc Generate unique numbers for every transactions for identification
 * @param {string} transaction - The type of transaction where the prefix of generated number is based on
 * @param {string} latestNumber - Latest entry to be incremented later on
 * @returns {string}
 */
export const generateNumber = (transaction = "", latestNumber = "") => {
	const transactionPrefixes = {
		customer: "CRM",
		po: "PONO",
		prt: "PRTNO",
	};
	const numberOfPaddings = 4;

	//Start the number at 0001
	if (!latestNumber) {
		let startMonth = (new Date().getMonth() + 1).toString();

		if (startMonth.length === 1) {
			startMonth = `0${startMonth}`;
		}

		return `${
			transactionPrefixes[transaction]
		}${new Date().getFullYear()}${startMonth}-0001`;
	}

	//Change year and month whenever which one of them changes according to date today
	let prefixLength = transactionPrefixes[transaction].length;
	let year = parseInt(latestNumber.substring(prefixLength, prefixLength + 4));
	let month = parseInt(
		latestNumber.substring(prefixLength + 4, prefixLength + 6)
	);
	let count = latestNumber.split("-").pop();

	if (year !== new Date().getFullYear()) {
		return `${
			transactionPrefixes[transaction]
		}${new Date().getFullYear()}01-0001`;
	}

	if (month !== new Date().getMonth() + 1) {
		return `${transactionPrefixes[transaction]}${year}${String(
			new Date().getMonth() + 1
		).padStart(2, "0")}-0001`;
	}

	//Add padding to zeroes
	count = parseInt(count) + 1;
	count = String(count).padStart(numberOfPaddings, "0");

	return `${transactionPrefixes[transaction]}${year}${String(month).padStart(
		2,
		"0"
	)}-${count}`;
};
