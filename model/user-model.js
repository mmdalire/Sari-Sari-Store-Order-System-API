import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
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
		unique: true,
	},
	gender: {
		type: String,
		required: true,
	},
	birthdate: {
		type: Date,
		required: true,
	},
	phoneNumber: {
		type: String,
		required: true,
	},
	password: {
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
	isActive: {
		type: Boolean,
		default: true,
	},
});

const User = mongoose.model("user", userSchema);
export default User;
