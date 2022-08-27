import express from "express";

import auth from "../../middleware/auth.js";
import {
	createCustomer,
	getAllCustomers,
	getCustomer,
	getCustomerCredits,
	editCustomer,
	blacklistCustomer,
	reverseBlacklistCustomer,
	deleteCustomer,
} from "../../controller/customer-contoller.js";

const router = express.Router();

router.post("/", auth, createCustomer);
router.get("/", auth, getAllCustomers);
router.get("/:customerId/credits", auth, getCustomerCredits);
router.get("/:customerId", auth, getCustomer);
router.patch("/:customerId/blacklist", auth, blacklistCustomer);
router.patch("/:customerId/reverseBlacklist", auth, reverseBlacklistCustomer);
router.patch("/:customerId", auth, editCustomer);
router.delete("/:customerId", auth, deleteCustomer);

export default router;
