import request from "supertest";
import app from "../express-setup.js";

import {
	authenticateExistingUser,
	createTestCategory,
	createTestProduct,
	createTestUser,
} from "./setup/setup.js";

import existingUsers from "./setup/data/user.json";
import existingProducts from "./setup/data/product.json";

import User from "../model/user-model.js";
import Category from "../model/category-model.js";
import Product from "../model/product-model.js";

let userId;
let token;
const MAX_EXECUTE_TIME = 30000;

beforeAll(async () => {
	await User.deleteMany().exec();
	await Category.deleteMany().exec();
	await Product.deleteMany().exec();

	userId = await createTestUser();
	await createTestCategory(userId);
	await createTestProduct(userId);

	token = await authenticateExistingUser();
});

const getStoreNameAndOwner = (store) => ({
	storeName: store.storeName,
	owner: store.owner,
});

const getProductDetails = (product) => ({
	name: product.name,
	code: product.code,
	unit: product.unit,
	price: product.price,
	cost: product.cost,
	quantity: product.quantity,
});

/**Test cases */
test(
	"Should retrieve all stores without search parameters and with default pagination",
	async () => {
		const expectedStores = existingUsers
			.filter((user) => user.store)
			.map((user) => ({
				storeName: user.store.name,
				owner: `${user.firstName} ${user.lastName}`,
			}));

		const res = await request(app)
			.get("/api/stores")
			.set("Authorization", `Bearer ${token}`)
			.expect(200);

		const actualStores = res.body.data.map(getStoreNameAndOwner);

		expect(actualStores).toEqual(expectedStores);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should retrieve only one store without search parameters and limited only to one result",
	async () => {
		const res = await request(app)
			.get("/api/stores?limit=1&page=1")
			.set("Authorization", `Bearer ${token}`)
			.expect(200);

		const actualNumberOfStores = res.body.data.length;

		expect(actualNumberOfStores).toBe(1);
	},
	MAX_EXECUTE_TIME
);

test("Should retrieve only the searched store", async () => {
	const searchStoreName = "JOHN STORE";
	const expectedStore = existingUsers
		.filter((user) => user.store && user.store.name === searchStoreName)
		.map((user) => ({
			storeName: user.store.name,
			owner: `${user.firstName} ${user.lastName}`,
		}));

	const res = await request(app)
		.get(`/api/stores?search=${searchStoreName}`)
		.set("Authorization", `Bearer ${token}`)
		.expect(200);

	const actualStore = res.body.data.map(getStoreNameAndOwner);

	expect(actualStore).toEqual(expectedStore);
});

test("Should retrieve store by using the searching the owner", async () => {
	const searchStoreOwner = "JANE";
	const expectedStore = existingUsers
		.filter(
			(user) =>
				user.firstName === searchStoreOwner ||
				user.lastName === searchStoreOwner
		)
		.map((user) => ({
			storeName: user.store.name,
			owner: `${user.firstName} ${user.lastName}`,
		}));

	const res = await request(app)
		.get(`/api/stores?search=${searchStoreOwner}`)
		.set("Authorization", `Bearer ${token}`)
		.expect(200);

	const actualStore = res.body.data.map(getStoreNameAndOwner);

	expect(actualStore).toEqual(expectedStore);
});

test("Should retrieve all stores if the search parameter is empty", async () => {
	const search = "";
	const expectedStore = existingUsers
		.filter((user) => user.store)
		.map((user) => ({
			storeName: user.store.name,
			owner: `${user.firstName} ${user.lastName}`,
		}));

	const res = await request(app)
		.get(`/api/stores?search=${search}`)
		.set("Authorization", `Bearer ${token}`)
		.expect(200);

	const actualStore = res.body.data.map(getStoreNameAndOwner);

	expect(actualStore).toEqual(expectedStore);
});

test("Should retrieve all products in the store without search parameters and with default pagination", async () => {
	const expectedProducts = existingProducts.map(getProductDetails);

	const res = await request(app)
		.get(`/api/stores/${userId}`)
		.set("Authorization", `Bearer ${token}`)
		.expect(200);

	const actualProducts = res.body.data.map(getProductDetails);

	expect(actualProducts).toEqual(expectedProducts);
});

test(
	"Should retrieve only one product in a specific store without search parameters and limited only to one result",
	async () => {
		const res = await request(app)
			.get(`/api/stores/${userId}?limit=1&page=1`)
			.set("Authorization", `Bearer ${token}`)
			.expect(200);

		const actualNumberOfProducts = res.body.data.length;

		expect(actualNumberOfProducts).toBe(1);
	},
	MAX_EXECUTE_TIME
);

test("Should retrieve all products in a store if the search parameter is empty", async () => {
	const search = "";
	const expectedStoreProducts = existingProducts.map(getStoreNameAndOwner);

	const res = await request(app)
		.get(`/api/stores/${userId}?search=${search}`)
		.set("Authorization", `Bearer ${token}`)
		.expect(200);

	const actualStoreProducts = res.body.data.map(getStoreNameAndOwner);

	expect(actualStoreProducts).toEqual(expectedStoreProducts);
});

test("Should retrieve all products in a store by search using product name", async () => {
	const search = "ligo sardines";
	const expectedStoreProducts = existingProducts
		.filter((product) => product.name === search.toUpperCase())
		.map(getProductDetails);

	const res = await request(app)
		.get(`/api/stores/${userId}?search=${search}`)
		.set("Authorization", `Bearer ${token}`)
		.expect(200);

	const actualstoreProducts = res.body.data.map(getProductDetails);

	expect(actualstoreProducts).toEqual(expectedStoreProducts);
});

test("Should NOT retrieve any store if the searched store DOESN'T exists", async () => {
	const searchStoreName = "UNKNOWN STORE";
	const expectedStore = [];

	const res = await request(app)
		.get(`/api/stores?search=${searchStoreName}`)
		.set("Authorization", `Bearer ${token}`)
		.expect(200);

	const actualStore = res.body.data;

	expect(actualStore).toEqual(expectedStore);
});

test("Should NOT retrieve any product if the store DOESN'T exists", async () => {
	const searchStoreId = "NO_ID";

	await request(app)
		.get(`/api/stores/${searchStoreId}`)
		.set("Authorization", `Bearer ${token}`)
		.expect(500);
});
