import dotenv from "dotenv";
import jwt from "jsonwebtoken";

import HttpError from "../model/http-error.js";
dotenv.config();

export default (req, res, next) => {
	try {
		const token = req.headers.authorization.split(" ")[1];
		if (!token) {
			throw new HttpError("Authentication failed", 401);
		}

		const decodedToken = jwt.verify(token, process.env.JSON_SECRET_KEY);
		req.userData = {
			userId: decodedToken.userId,
		};

		next();
	} catch (err) {
		return next(new HttpError("Authentication failed!", 401));
	}
};
