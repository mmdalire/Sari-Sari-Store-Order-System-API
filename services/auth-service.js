import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const createAuthToken = (userId) => {
	let token;
	try {
		token = jwt.sign(
			{
				userId,
			},
			process.env.JSON_SECRET_KEY
		);
	} catch (err) {
		throw new HttpError("Something went wrong. Please try again", 500);
	}

	return token;
};
