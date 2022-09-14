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

//For ownership validation in every update and delete customer
customerSchema.statics.ownershipValidation = async (userId, customerId) => {
	const customer = await Customer.findById(customerId).exec();

	//Cannot delete other user's customers
	if (userId !== customer.userId.toString()) {
		throw new Error();
	}

	return true;
};

const Customer = mongoose.model("customer", customerSchema);
export default Customer;
