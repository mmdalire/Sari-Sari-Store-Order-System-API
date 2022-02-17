import mongoose from "mongoose";

const purchaseReturnSchema = new mongoose.Schema({
	prtNo: {
		type: String,
		required: true,
	},
	order: {
		type: mongoose.Types.ObjectId,
		required: true,
		ref: "order",
	},
	returnedProducts: [
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
		},
	],
	reason: {
		type: String,
	},
	createdDate: {
		type: Date,
		default: Date.now,
	},
	userId: {
		type: mongoose.Types.ObjectId,
		required: true,
	},
});

const PurchaseReturn = mongoose.model("purchase_return", purchaseReturnSchema);
export default PurchaseReturn;
