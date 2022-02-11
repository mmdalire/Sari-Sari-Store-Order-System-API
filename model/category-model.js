import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
	code: {
		type: String,
		required: true,
	},
	createdDate: {
		type: Date,
		default: Date.now(),
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

//For ownership validation in every update and delete category
categorySchema.statics.ownershipValidation = async (userId, categoryId) => {
	const category = await Category.findById(categoryId).exec();

	//Cannot edit/delete other user's categories
	if (userId !== category.userId.toString()) {
		throw new Error();
	}

	return;
};

const Category = mongoose.model("category", categorySchema);
export default Category;
