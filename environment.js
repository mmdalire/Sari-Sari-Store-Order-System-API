import dotenv from "dotenv";

dotenv.config();

export const environment = {
	localhost: {
		dbUrl: process.env.MONGO_LOCALHOST_URL,
	},
	testEnv: {
		dbUrl: process.env.MONGO_TEST_URL,
	},
	production: {
		dbUrl: process.env.MONGO_PRODUCTION_URL,
	},
};
