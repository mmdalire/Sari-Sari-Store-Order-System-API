import User from "../../model/user-model";
import Category from "../../model/category-model";
import Product from "../../model/product-model";

import existingUsers from "../setup/data/user.json";
import existingCategories from "../setup/data/category.json";
import existingProducts from "../setup/data/product.json";

import { encryptPassword } from "../../services/password-service.js";
import { createAuthToken } from "../../services/auth-service.js";

export const primaryTestEmail = "jdoe@email.com";
export const primaryTestPassword = "12345678";

export const createTestUser = async () => {
	const createdUsers = await Promise.all(
		existingUsers.map(async (user) => ({
			...user,
			password: await encryptPassword(primaryTestPassword),
		}))
	);

	const users = await User.insertMany(createdUsers);
	const { _id: id } = users.find((user) => user.email === primaryTestEmail);
	return id.toString();
};

export const createTestCategory = async (userId) => {
	const categories = existingCategories.map((category) => ({
		...category,
		userId,
	}));

	await Category.insertMany(categories);
};

export const createTestProduct = async (userId) => {
	const products = existingProducts.map((product) => ({
		...product,
		userId,
	}));

	await Product.insertMany(products);
};

export const authenticateExistingUser = async () => {
	const { id: userId } = await User.findOne({
		email: primaryTestEmail,
	}).exec();

	return createAuthToken(userId);
};
