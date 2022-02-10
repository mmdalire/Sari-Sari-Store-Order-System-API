import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";

import HttpError from "./model/http-error.js";

import customerRoute from "./routes/customer-route.js";
import userRoute from "./routes/user-route.js";
dotenv.config();

const app = express();

//Middlewares
app.use(express.json());
app.use(cors());

//Routes
app.use("/api/users", userRoute);
app.use("/api/customers", customerRoute);
app.use((req, res, next) => {
	return next(new HttpError("Could not found this route!", 404));
});

//Error handling
app.use((error, req, res, next) => {
	if (res.headerSent) {
		return next(error);
	}

	res.status(error.code || 500);
	res.json({
		message: error.message || "An unknown error occured!",
	});
});

//Database connection
const dbUrl = `mongodb://localhost:27017/inventory_system?readPreference=primary&appname=MongoDB%20Compass&ssl=false`;
mongoose
	.connect(dbUrl)
	.then(() => {
		app.listen(process.env.PORT || 6000, () => {
			console.log(`Server running on port ${process.env.PORT || 6000}`);
		});
	})
	.catch((err) => {
		console.log(err);
	});
