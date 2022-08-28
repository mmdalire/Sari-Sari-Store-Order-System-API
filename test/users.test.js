import request from "supertest";
import app from "../express-setup.js";

test("Should signup a new user", async () => {
	await request(app)
		.post("/api/users/signup")
		.send({
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
		})
		.expect(201);
}, 30000);
