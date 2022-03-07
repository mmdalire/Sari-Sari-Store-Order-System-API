import mongoose from "mongoose";

const productSchema = mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
	category: {
		type: String,
		required: true,
	},
	description: {
		type: String,
	},
	code: {
		type: String,
		required: true,
	},
	type: {
		type: String,
		required: true,
	},
	unit: {
		type: String,
		default: "pcs",
	},
	price: {
		type: Number,
		required: true,
		default: 0,
	},
	cost: {
		type: Number,
		required: true,
		default: 0,
	},
	quantity: {
		type: Number,
		required: true,
	},
	userId: {
		type: mongoose.Types.ObjectId,
		required: true,
		ref: "user",
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

productSchema.statics.ownershipValidation = async (userId, productId) => {
	const product = await Product.findById(productId).exec();

	//Cannot edit/delete other user's products
	if (userId !== product.userId.toString()) {
		throw new Error();
	}

	return;
};

const Product = mongoose.model("product", productSchema);
export default Product;
