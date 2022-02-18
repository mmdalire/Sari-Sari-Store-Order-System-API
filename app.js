import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";

import HttpError from "./model/http-error.js";

import categoryRoute from "./routes/category-route.js";
import customerRoute from "./routes/customer-route.js";
import dashboardRoute from "./routes/dashboard-route.js";
import inventoryRoute from "./routes/inventory-route.js";
import orderRoute from "./routes/order-route.js";
import productRoute from "./routes/product-route.js";
import purchaseReturnRoute from "./routes/purchase-return-route.js";
import userRoute from "./routes/user-route.js";
dotenv.config();

const app = express();

//Middlewares
app.use(express.json());
app.use(cors());

//Routes
app.use("/api/users", userRoute);
app.use("/api/dashboard", dashboardRoute);
app.use("/api/customers", customerRoute);
app.use("/api/categories", categoryRoute);
app.use("/api/inventory", inventoryRoute);
app.use("/api/orders", orderRoute);
app.use("/api/products", productRoute);
app.use("/api/purchase_return", purchaseReturnRoute);
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
