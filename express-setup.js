import cors from "cors";
import express from "express";

import "./db/mongoose.js";

import HttpError from "./model/http-error.js";

import routes from "./routes/index.js";

const app = express();

//Middlewares
app.use(express.json());
app.use(cors());

//Routes
app.use("/api", routes);
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

export default app;
