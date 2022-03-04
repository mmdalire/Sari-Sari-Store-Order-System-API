import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
	poNo: {
		type: String,
		required: true,
	},
	customer: {
		type: mongoose.Types.ObjectId,
		required: true,
		ref: "user",
	},
	products: [
		{
			code: {
				type: String,
				required: true,
			},
			name: {
				type: String,
				required: true,
			},
			quantity: {
				type: Number,
				required: true,
			},
			price: {
				type: Number,
				required: true,
			},
			cost: {
				type: Number,
				required: true,
			},
		},
	],
	prtIds: [{ type: mongoose.Types.ObjectId, ref: "returns" }],
	credit: {
		type: Number,
		default: 0,
	},
	status: {
		type: String,
		required: true,
	},
	remarks: {
		type: String,
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
	userId: {
		type: mongoose.Types.ObjectId,
		required: true,
		ref: "user",
	},
});

orderSchema.statics.ownershipValidation = async (userId, orderId) => {
	const order = await Order.findById(orderId).exec();

	//Cannot edit/delete other user's orders
	if (userId !== order.userId.toString()) {
		throw new Error();
	}

	return;
};

const Order = mongoose.model("order", orderSchema);
export default Order;
