import request from "supertest";
import app from "../express-setup.js";

import { encryptPassword } from "../services/password-service.js";
import { createAuthToken } from "../services/auth-service.js";

import User from "../model/user-model.js";

const MAX_EXECUTE_TIME = 30000;
const userTestRequest = {
	firstName: "Mark",
	lastName: "Test",
	email: "mtest@email.com",
	gender: "male",
	birthdate: "1999-03-17",
	phoneNumber: "11112223333",
	store: {
		name: "store2",
		startingDate: "2000-02-02",
	},
	address: {
		lineNumber: "Blk 122, Lot 1",
		barangay: "Brgy. San Tokyo",
		city: "Rome",
		province: "Los Angeles",
		country: "Philippines",
	},
	password: "12345678",
};

const existingUser = {
	firstName: "John",
	lastName: "Doe",
	email: "jdoe@email.com",
	gender: "male",
	birthdate: "2000-01-20",
	phoneNumber: "4444555666",
	store: {
		name: "John's Store",
		startingDate: "2010-02-02",
	},
	address: {
		lineNumber: "Blk 1, Lot 1",
		barangay: "Brgy. Los Angeles",
		city: "California",
		province: "Texas",
		country: "Philippines",
	},
};

const loginCredentialsForExistingUser = {
	email: existingUser.email,
	password: "12345678",
};

const authenticateExistingUser = async () => {
	const { id: userId } = await User.findOne({
		email: existingUser.email,
	}).exec();

	return createAuthToken(userId);
};

beforeEach(async () => {
	await User.deleteMany().exec();

	//Encrypt existing password
	existingUser.password = await encryptPassword("12345678");

	//Create a user for logged in testing
	const loggedInUser = new User(existingUser);
	await loggedInUser.save();
});

/** Test cases */
test(
	"Should signup a new user as a store owner",
	async () => {
		await request(app)
			.post("/api/users/signup")
			.send(userTestRequest)
			.expect(201);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should signup a new user as a customer",
	async () => {
		await request(app)
			.post("/api/users/signup")
			.send({
				...userTestRequest,
				store: undefined,
			})
			.expect(201);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should login with an existing account using correct credentials",
	async () => {
		await request(app)
			.post("/api/users/login")
			.send(loginCredentialsForExistingUser)
			.expect(200);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should change password with correct credentials for logged in user",
	async () => {
		const token = await authenticateExistingUser();

		await request(app)
			.post("/api/users/change_password")
			.set("Authorization", `Bearer ${token}`)
			.send({
				oldPassword: loginCredentialsForExistingUser.password,
				newPassword: "changed_password",
			})
			.expect(201);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should NOT login with an existing account using incorrect credentials",
	async () => {
		await request(app)
			.post("/api/users/login")
			.send({
				...loginCredentialsForExistingUser,
				password: "incorrect_password",
			})
			.expect(400);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should NOT login if there is NO existing account",
	async () => {
		await request(app)
			.post("/api/users/login")
			.send({
				email: "m@notexists.com",
				password: "incorrect_password",
			})
			.expect(400);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should NOT signup a user if the user already exists",
	async () => {
		await request(app)
			.post("/api/users/signup")
			.send(existingUser)
			.expect(400);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should NOT signup a user if first name is NULL",
	async () => {
		await request(app)
			.post("/api/users/signup")
			.send({
				...userTestRequest,
				firstName: undefined,
			})
			.expect(422);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should NOT signup a user if last name is NULL",
	async () => {
		await request(app)
			.post("/api/users/signup")
			.send({
				...userTestRequest,
				lastName: undefined,
			})
			.expect(422);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should NOT signup a user if email is NULL",
	async () => {
		await request(app)
			.post("/api/users/signup")
			.send({
				...userTestRequest,
				email: undefined,
			})
			.expect(422);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should NOT signup a user if email is NOT valid",
	async () => {
		await request(app)
			.post("/api/users/signup")
			.send({
				...userTestRequest,
				email: "invalid_email",
			})
			.expect(422);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should NOT signup a user if gender is NULL",
	async () => {
		await request(app)
			.post("/api/users/signup")
			.send({
				...userTestRequest,
				gender: undefined,
			})
			.expect(422);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should NOT signup a user if gender is NOT valid",
	async () => {
		await request(app)
			.post("/api/users/signup")
			.send({
				...userTestRequest,
				gender: "invalid_gender",
			})
			.expect(422);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should NOT signup a user if birthdate is NULL",
	async () => {
		await request(app)
			.post("/api/users/signup")
			.send({
				...userTestRequest,
				birthdate: undefined,
			})
			.expect(422);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should NOT signup a user if birthdate is NOT valid",
	async () => {
		await request(app)
			.post("/api/users/signup")
			.send({
				...userTestRequest,
				birthdate: "invalid_birthday",
			})
			.expect(422);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should NOT signup a user if phone number is NULL",
	async () => {
		await request(app)
			.post("/api/users/signup")
			.send({
				...userTestRequest,
				phoneNumber: undefined,
			})
			.expect(422);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should NOT signup a user if phone number is NOT valid",
	async () => {
		await request(app)
			.post("/api/users/signup")
			.send({
				...userTestRequest,
				phoneNumber: "phone_invalid",
			})
			.expect(422);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should NOT signup a user if store name is NULL (for STORE OWNERS)",
	async () => {
		await request(app)
			.post("/api/users/signup")
			.send({
				...userTestRequest,
				store: {
					name: undefined,
					startingDate: "2022-01-01",
				},
			})
			.expect(422);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should NOT signup a user if store name exists (for STORE OWNERS)",
	async () => {
		await request(app)
			.post("/api/users/signup")
			.send(existingUser)
			.expect(400);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should NOT signup a user if starting date is NULL (for STORE OWNERS)",
	async () => {
		await request(app)
			.post("/api/users/signup")
			.send({
				...userTestRequest,
				store: {
					name: "Sample 1",
					startingDate: undefined,
				},
			})
			.expect(422);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should NOT signup a user if starting date is NOT valid (for STORE OWNERS)",
	async () => {
		await request(app)
			.post("/api/users/signup")
			.send({
				...userTestRequest,
				store: {
					name: "Sample 1",
					startingDate: "invalid_startingdate",
				},
			})
			.expect(422);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should NOT signup a user if address line is NULL",
	async () => {
		await request(app)
			.post("/api/users/signup")
			.send({
				...userTestRequest,
				address: {
					lineNumber: undefined,
				},
			})
			.expect(422);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should NOT signup a user if barangay is NULL",
	async () => {
		await request(app)
			.post("/api/users/signup")
			.send({
				...userTestRequest,
				address: {
					barangay: undefined,
				},
			})
			.expect(422);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should NOT signup a user if city is NULL",
	async () => {
		await request(app)
			.post("/api/users/signup")
			.send({
				...userTestRequest,
				address: {
					city: undefined,
				},
			})
			.expect(422);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should NOT signup a user if province is NULL",
	async () => {
		await request(app)
			.post("/api/users/signup")
			.send({
				...userTestRequest,
				address: {
					province: undefined,
				},
			})
			.expect(422);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should NOT signup a user if country is NULL",
	async () => {
		await request(app)
			.post("/api/users/signup")
			.send({
				...userTestRequest,
				address: {
					country: undefined,
				},
			})
			.expect(422);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should NOT signup a user if password is NULL",
	async () => {
		await request(app)
			.post("/api/users/signup")
			.send({
				...userTestRequest,
				address: {
					password: undefined,
				},
			})
			.expect(422);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should NOT signup a user if password is less than 8 characters",
	async () => {
		await request(app)
			.post("/api/users/signup")
			.send({
				...userTestRequest,
				address: {
					password: "fail",
				},
			})
			.expect(422);
	},
	MAX_EXECUTE_TIME
);

test(
	"Should NOT change password with incorrect credentials for logged in user",
	async () => {
		const token = await authenticateExistingUser();

		await request(app)
			.post("/api/users/change_password")
			.set("Authorization", `Bearer ${token}`)
			.send({
				oldPassword: "incorrect_password",
				newPassword: "changed_password",
			})
			.expect(400);
	},
	MAX_EXECUTE_TIME
);
