import HttpError from "../../model/http-error";
import { customerValidation } from "../../util/validators/customer-validate";

const referenceData = {
	firstName: "WANDA",
	lastName: "MAXIMOFF",
	storeOwner: "SAMPLE_OWNER",
	middleInitial: "W",
	email: "wmaximoff@email.com",
	phoneNumber: "99991112222",
	birthdate: "1984-05-16T00:00:00.000Z",
	address: "Some address",
	userId: "SAMPLE_USER_ID",
};

/** Test cases */
describe("Creation of customer is INVALID when", () => {
	it("the data is NULL", () => {
		expect(() => customerValidation(null)).toThrow(HttpError);
	});

	it("firstname is NULL", () => {
		expect(() =>
			customerValidation({
				...referenceData,
				firstName: null,
			})
		).toThrow(HttpError);
	});

	it("lastname is NULL", () => {
		expect(() =>
			customerValidation({
				...referenceData,
				lastName: null,
			})
		).toThrow(HttpError);
	});

	it("middle initial is a NUMBER", () => {
		expect(() =>
			customerValidation({
				...referenceData,
				middleInitial: 1,
			})
		).toThrow(HttpError);
	});

	it("email is NULL", () => {
		expect(() =>
			customerValidation({
				...referenceData,
				email: null,
			})
		).toThrow(HttpError);
	});

	it("email is NOT a valid email", () => {
		expect(() =>
			customerValidation({
				...referenceData,
				email: "invalid_email",
			})
		).toThrow(HttpError);
	});

	it("phoneNumber is NULL", () => {
		expect(() =>
			customerValidation({
				...referenceData,
				phoneNumber: null,
			})
		).toThrow(HttpError);
	});

	it("phoneNumber is a NUMBER", () => {
		expect(() =>
			customerValidation({
				...referenceData,
				phoneNumber: 1,
			})
		).toThrow(HttpError);
	});

	it("birthdate is NULL", () => {
		expect(() =>
			customerValidation({
				...referenceData,
				birthdate: null,
			})
		).toThrow(HttpError);
	});

	it("birthdate is NOT a date", () => {
		expect(() =>
			customerValidation({
				...referenceData,
				birthdate: "INVALID_BIRTHDAY",
			})
		).toThrow(HttpError);
	});

	it("address is NULL", () => {
		expect(() =>
			customerValidation({
				...referenceData,
				address: null,
			})
		).toThrow(HttpError);
	});

	it("user ID is NULL", () => {
		expect(() =>
			customerValidation({
				...referenceData,
				userId: null,
			})
		).toThrow(HttpError);
	});

	it("store owner is NULL for creation of customer", () => {
		expect(() =>
			customerValidation({
				...referenceData,
				storeOwner: null,
			})
		).toThrow(HttpError);
	});
});
