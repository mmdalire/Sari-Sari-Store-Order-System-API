/**
 * @desc Make the first letter of a string to be capitalized
 * @param {string} data - To be capitalized in first letter
 * @returns {string}
 */
export const capitalizeFirst = (data) => {
	return data.charAt(0).toUpperCase() + data.slice(1).toLowerCase();
};

/**
 * @desc Reformat JOI errors into more human readable format
 * @param {object} error - The raw error provided by JOI
 * @returns {string}
 */
export const reformatJoiError = (error) => {
	const details = error.details[0];

	const message = details.message.split('"').pop();
	const fieldName = capitalizeFirst(details.path.pop());
	return `${fieldName}${message}!`;
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
	let year = parseInt(latestNumber.substring(3, 7));
	let month = parseInt(latestNumber.substring(7, 9));
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
