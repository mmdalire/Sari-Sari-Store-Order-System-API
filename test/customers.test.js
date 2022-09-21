import request from "supertest";
import app from "../express-setup.js";

import {
	authenticateExistingUser,
	createTestCustomer,
	createTestUser,
} from "./setup/setup.js";

import existingCustomers from "./setup/data/customer.json";

import User from "../model/user-model.js";
import Customer from "../model/customer-model.js";

let userId;
let token;
const MAX_EXECUTE_TIME = 30000;
const customerTest = {
	firstName: "STEVE",
	lastName: "ROGERS",
	middleInitial: "Q",
	email: "srogers@email.com",
	phoneNumber: "88887771111",
	birthdate: "1940-05-16T00:00:00.000Z",
	address: "Brooklyn",
};

beforeEach(async () => {
	await User.deleteMany().exec();
	await Customer.deleteMany().exec();

	userId = await createTestUser();
	await createTestCustomer(userId);

	token = await authenticateExistingUser();
});

const areCustomersEqual = (expected, actual) => {
	for (let i = 0; i < expected.length; i++) {
		const hasData = actual.find(
			(customer) =>
				customer.firstName === expected[i].firstName &&
				customer.lastName === expected[i].lastName
		);

		if (!hasData) {
			return false;
		}
	}
	return true;
};

const retrieveExistingCustomer = async (customerFirstName) => {
	try {
		const customer = await Customer.findOne({
			firstName: customerFirstName,
		}).lean();
		return customer;
	} catch (err) {
		return null;
	}
};

const toggleBlacklistCustomer = async (customerFirstName, isBlacklisted) => {
	try {
		const customer = await Customer.findOneAndUpdate(
			{
				firstName: customerFirstName,
			},
			{
				isBlacklisted,
			}
		).lean();
		return customer;
	} catch (err) {
		return null;
	}
};

const getMainCustomerInfo = (customer) => ({
	firstName: customer.firstName,
	lastName: customer.lastName,
	middleInitial: customer.middleInitial,
});

/** Test cases */
test(
	"Should create a new customer",
	async () => {
		customerTest.storeOwner = userId;
		customerTest.userId = userId;

		await request(app)
			.post("/api/storeowner/customers")
			.set("Authorization", `Bearer ${token}`)
			.send(customerTest)
			.expect(201);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should retrieve all customers without search parameters and with default pagination",
	async () => {
		const expectedCustomers = existingCustomers.map(getMainCustomerInfo);

		const res = await request(app)
			.get("/api/storeowner/customers")
			.set("Authorization", `Bearer ${token}`)
			.expect(200);

		const actualCustomers = res.body.data.map(getMainCustomerInfo);

		expect(areCustomersEqual(expectedCustomers, actualCustomers)).toBe(
			true
		);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should retrieve only one customer without search parameters and limited only to one result",
	async () => {
		const res = await request(app)
			.get("/api/storeowner/customers?limit=1&page=1")
			.set("Authorization", `Bearer ${token}`)
			.expect(200);

		const actualNumberOfCustomer = res.body.data.length;

		expect(actualNumberOfCustomer).toBe(1);
	},
	MAX_EXECUTE_TIME
);

test("Should retrieve only the searched customer", async () => {
	const searchCustomer = "WANDA MAXIMOFF";
	const expectedCustomer = existingCustomers
		.filter(
			(customer) =>
				customer.firstName === searchCustomer ||
				customer.lastName === searchCustomer
		)
		.map(getMainCustomerInfo);

	const res = await request(app)
		.get(`/api/storeowner/customers?search=${searchCustomer}`)
		.set("Authorization", `Bearer ${token}`)
		.expect(200);

	const actualCustomer = res.body.data.map(getMainCustomerInfo);

	expect(areCustomersEqual(expectedCustomer, actualCustomer)).toBe(true);
});

test("Should retrieve all customers if the search parameter is empty", async () => {
	const search = "";
	const expectedCustomers = existingCustomers.map(getMainCustomerInfo);

	const res = await request(app)
		.get(`/api/storeowner/customers?search=${search}`)
		.set("Authorization", `Bearer ${token}`)
		.expect(200);

	const actualCustomers = res.body.data.map(getMainCustomerInfo);

	expect(areCustomersEqual(expectedCustomers, actualCustomers)).toBe(true);
});

test("Should NOT retrieve any customers if the searched customer DOESN'T exists", async () => {
	const searchCustomerName = "UNKNOWN CUSTOMER";
	const expectedCustomer = [];

	const res = await request(app)
		.get(`/api/storeowner/customers?search=${searchCustomerName}`)
		.set("Authorization", `Bearer ${token}`)
		.expect(200);

	const actualCustomer = res.body.data;

	expect(areCustomersEqual(expectedCustomer, actualCustomer)).toBe(true);
});

test("Should retrieve a customer with an existing customer ID", async () => {
	const retrievedCustomer = await retrieveExistingCustomer("WANDA");
	const expectedCustomer = {
		...retrievedCustomer,
		_id: retrievedCustomer._id.toString(),
		storeOwner: retrievedCustomer.storeOwner.toString(),
		userId: retrievedCustomer.userId.toString(),
	};

	const res = await request(app)
		.get(`/api/storeowner/customers/${expectedCustomer._id}`)
		.set("Authorization", `Bearer ${token}`)
		.expect(200);

	const actualCustomer = {
		...res.body,
		_id: res.body._id,
		storeOwner: res.body.storeOwner,
		userId: res.body.userId,
	};

	delete expectedCustomer.createdDate;
	delete expectedCustomer.birthdate;
	delete actualCustomer.createdDate;
	delete actualCustomer.birthdate;

	expect(actualCustomer).toEqual(expectedCustomer);
});

test("Should edit a customer with an existing customer ID", async () => {
	const retrievedCustomer = await retrieveExistingCustomer("WANDA");
	const newCustomerDetail = {
		firstName: "WANDA",
		lastName: "MAXIMOFF",
		middleInitial: "Z",
		email: "wmxoff@email.com",
		phoneNumber: "999888777",
		birthdate: "2000-01-02T00:00:00.000Z",
		address: "Some another address",
		userId: retrievedCustomer.userId.toString(),
	};

	await request(app)
		.patch(`/api/storeowner/customers/${retrievedCustomer._id}`)
		.set("Authorization", `Bearer ${token}`)
		.send(newCustomerDetail)
		.expect(200);
});

test("Should delete a customer with an existing customer ID", async () => {
	const retrievedCustomer = await retrieveExistingCustomer("WANDA");

	await request(app)
		.delete(`/api/storeowner/customers/${retrievedCustomer._id}`)
		.set("Authorization", `Bearer ${token}`)
		.expect(200);
});

test("Should blacklist a customer with an existing customer ID", async () => {
	const retrievedCustomer = await toggleBlacklistCustomer("WANDA", false);

	await request(app)
		.patch(`/api/storeowner/customers/${retrievedCustomer._id}/blacklist`)
		.set("Authorization", `Bearer ${token}`)
		.expect(200);
});

test("Should reverse blacklist a customer with an existing customer ID", async () => {
	const retrievedCustomer = await toggleBlacklistCustomer("WANDA", true);

	await request(app)
		.patch(
			`/api/storeowner/customers/${retrievedCustomer._id}/reverseBlacklist`
		)
		.set("Authorization", `Bearer ${token}`)
		.expect(200);
});

test("Should NOT retrieve a customer with a non-existent customer ID", async () => {
	await request(app)
		.get(`/api/storeowner/customers/INVALID_ID`)
		.set("Authorization", `Bearer ${token}`)
		.expect(500);
});

test("Should NOT edit a customer with a non-existent customer ID", async () => {
	const newCustomerDetail = {
		firstName: "WANDA",
		lastName: "MAXIMOFF",
		middleInitial: "Z",
		email: "wmxoff@email.com",
		phoneNumber: "999888777",
		birthdate: "2000-01-02T00:00:00.000Z",
		address: "Some another address",
		userId: "INVALID_USERID",
	};

	await request(app)
		.patch(`/api/storeowner/customers/INVALID_ID`)
		.set("Authorization", `Bearer ${token}`)
		.send(newCustomerDetail)
		.expect(401);
});

test("Should NOT delete a customer with a non-existent customer ID", async () => {
	await request(app)
		.delete(`/api/storeowner/customers/INVALID_ID`)
		.set("Authorization", `Bearer ${token}`)
		.expect(401);
});

test("Should NOT reverse blacklist a non-blacklisted customer", async () => {
	const retrievedCustomer = await toggleBlacklistCustomer("WANDA", false);

	await request(app)
		.patch(
			`/api/storeowner/customers/${retrievedCustomer._id}/reverseBlacklist`
		)
		.set("Authorization", `Bearer ${token}`)
		.expect(422);
});

test("Should NOT blacklist a blacklisted customer", async () => {
	const retrievedCustomer = await toggleBlacklistCustomer("WANDA", true);

	await request(app)
		.patch(`/api/storeowner/customers/${retrievedCustomer._id}/blacklist`)
		.set("Authorization", `Bearer ${token}`)
		.expect(422);
});
