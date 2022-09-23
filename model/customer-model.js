import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
	customerNo: {
		type: String,
		required: true,
	},
	storeOwner: {
		type: mongoose.Types.ObjectId,
		required: true,
		ref: "user",
	},
	firstName: {
		type: String,
		required: true,
	},
	lastName: {
		type: String,
		required: true,
	},
	middleInitial: {
		type: String,
	},
	email: {
		type: String,
		required: true,
	},
	phoneNumber: {
		type: String,
		required: true,
	},
	birthdate: {
		type: Date,
		required: true,
	},
	address: {
		type: String,
		required: true,
	},
	createdDate: {
		type: Date,
		default: Date.now,
	},
	updatedDate: {
		type: Date,
	},
	deactivatedDate: {
		type: Date,
	},
	isBlacklisted: {
		type: Boolean,
		default: false,
	},
	isActive: {
		type: Boolean,
		default: true,
	},
	userId: {
		type: mongoose.Types.ObjectId,
		required: true,
		ref: "user",
	},
});

//For validation if the customer exists
customerSchema.statics.isCustomerExists = async (customerId) => {
	const customer = await Customer.findById(customerId).exec();

	return customer ? true : false;
};

//For retrieving the latest customer number
customerSchema.statics.getLatestCustomerNumber = async (storeOwnerId) => {
	try {
		const customer = await Customer.findOne({ storeOwner: storeOwnerId })
			.sort({ createdDate: -1 })
			.limit(1)
			.exec();

		return customer ? customer.customerNo : null;
	} catch (err) {
		throw new HttpError(
			"Cannot create customer information. Please try again later!",
			500
		);
	}
};

//For ownership validation in every update and delete customer
customerSchema.statics.ownershipValidation = async (userId, customerId) => {
	const customer = await Customer.findById(customerId).exec();

	//Cannot delete or update other user's customers
	if (userId !== customer.storeOwner.toString()) {
		throw new HttpError("Unauthorized access to this operation!", 401);
	}

	return true;
};

const Customer = mongoose.model("customer", customerSchema);
export default Customer;
